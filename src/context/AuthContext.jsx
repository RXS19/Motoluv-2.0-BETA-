import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signInWithProvider,
  formatSupabaseAuthError,
  fetchUserProfile,
  updateUserProfile,
  syncGoogleUserProfile,
  logAuthDiagnostic,
} from '../lib/supabase';

const STORAGE_ACTIVE_VIEW_KEY = 'motoluv_active_view';

const getStoredActiveView = () => {
  try {
    const val = localStorage.getItem(STORAGE_ACTIVE_VIEW_KEY);
    if (val === 'comprador' || val === 'vendedor') {
      return val;
    }
  } catch {
    // localStorage not accessible
  }
  return null;
};

const resolveValidActiveView = (desiredView, userRole) => {
  if (userRole === 'comprador') return 'comprador';
  if (userRole === 'vendedor') return 'vendedor';
  if (desiredView === 'comprador' || desiredView === 'vendedor') {
    return desiredView;
  }
  return 'vendedor';
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveViewState] = useState(() => {
    const stored = getStoredActiveView();
    return stored || 'vendedor';
  });

  const setActiveView = useCallback((nextView) => {
    const valid = nextView === 'comprador' ? 'comprador' : 'vendedor';
    const resolved = resolveValidActiveView(valid, user?.role);
    setActiveViewState(resolved);
    try {
      localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, resolved);
    } catch (e) {
      console.warn('Error guardando motoluv_active_view:', e);
    }
  }, [user?.role]);

  // Sincronizar vista activa entre pestañas y ventanas
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_ACTIVE_VIEW_KEY && (e.newValue === 'comprador' || e.newValue === 'vendedor')) {
        const resolved = resolveValidActiveView(e.newValue, user?.role);
        setActiveViewState(resolved);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.role]);

  // Helper para construir el objeto de usuario estandarizado para toda la app
  const buildUserObject = useCallback(async (authUser, currentSession = null) => {
    if (!authUser) return null;

    const metadata = authUser.user_metadata || {};
    let profile = null;

    logAuthDiagnostic('buildUserObject_inicio', {
      userId: authUser.id,
      userEmail: authUser.email,
      hasSession: Boolean(currentSession),
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const isGoogle = 
          authUser.app_metadata?.provider === 'google' ||
          authUser.app_metadata?.providers?.includes('google') ||
          authUser.identities?.some((id) => id.provider === 'google');

        if (isGoogle) {
          await syncGoogleUserProfile(authUser);
        }

        profile = await fetchUserProfile(authUser.id, metadata);
      } catch (err) {
        logAuthDiagnostic('fetchUserProfile_exception', {
          userId: authUser.id,
          message: err?.message || String(err),
        });
      }
    }

    const fullName = profile?.full_name || profile?.name || metadata.full_name || metadata.name || (authUser.email ? authUser.email.split('@')[0] : 'Usuario');
    const firstName = profile?.first_name || metadata.given_name || metadata.first_name || (fullName ? fullName.split(' ')[0] : null);
    const lastName = profile?.last_name || metadata.family_name || metadata.last_name || null;
    const role = profile?.role || metadata.role || 'both';
    const city = profile?.city || metadata.city || 'Ciudad de México';
    const phone = profile?.phone || metadata.phone || metadata.phone_number || metadata.phoneNumber || authUser.phone || metadata.custom_claims?.phone || '';
    const phoneUpdatedOnce = Boolean(profile?.phone_updated_once || metadata.phone_updated_once || (profile?.phone_change_count && profile.phone_change_count >= 1));
    const phoneChangeCount = profile?.phone_change_count ?? (phoneUpdatedOnce ? 1 : 0);
    const bankClabe = profile?.bank_clabe || metadata.bank_clabe || '';
    const bankName = profile?.bank_name || metadata.bank_name || '';
    const bankHolder = profile?.bank_holder || metadata.bank_holder || fullName;
    const bankUpdatedAt = profile?.bank_updated_at || metadata.bank_updated_at || null;
    const avatarUrl = profile?.avatar_url || metadata.avatar_url || metadata.picture || '';
    const identityVerificationStatus = profile?.identity_verification_status || 'unverified';
    const rating = profile?.rating !== undefined && profile?.rating !== null ? Number(profile.rating) : null;
    const operations = profile?.operations !== undefined && profile?.operations !== null ? Number(profile.operations) : 0;

    return {
      id: authUser.id,
      nid: profile?.nid ?? metadata.nid ?? authUser?.nid ?? null,
      email: authUser.email,
      name: fullName,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone,
      phone_updated_once: phoneUpdatedOnce,
      phone_change_count: phoneChangeCount,
      city,
      role,
      avatar_url: avatarUrl,
      identity_verification_status: identityVerificationStatus,
      rating,
      operations,
      bank_clabe: bankClabe,
      bank_name: bankName,
      bank_holder: bankHolder,
      bank_updated_at: bankUpdatedAt,
      created_at: profile?.created_at || authUser.created_at || new Date().toISOString(),
      updated_at: profile?.updated_at || new Date().toISOString(),
      raw: authUser,
    };
  }, []);

  // Sincronización de registro con Kommo (Edge Function kommo-register-user)
  // La Edge Function verifica kommo_sync para procesar únicamente registros pendientes y evitar duplicados.
  // Un eventual fallo o demora de Kommo NUNCA bloquea ni cancela la sesión o registro del usuario en Motoluv.
  const syncKommoRegistration = useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.functions.invoke('kommo-register-user');
      }
    } catch (kommoErr) {
      console.warn('[Kommo] Aviso en sincronización de registro:', kommoErr?.message || kommoErr);
    }
  }, []);

  // Inicializar y escuchar cambios de sesión con Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        console.warn('Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error al obtener sesión inicial de Supabase:', error);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            const userObj = await buildUserObject(initialSession.user, initialSession);
            setUser(userObj);
            const currentStored = getStoredActiveView();
            const resolved = resolveValidActiveView(currentStored, userObj?.role);
            setActiveViewState(resolved);
            try {
              localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, resolved);
            } catch {
              // ignore
            }
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Excepción al inicializar sesión:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Suscripción reactiva a cambios de autenticación (Login, Google OAuth, Logout, Token Refresh)
    let subscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;

        console.log(`[Supabase Auth Event: ${event}]`, {
          hasSession: Boolean(currentSession),
          userId: currentSession?.user?.id || null,
          userEmail: currentSession?.user?.email || null,
        });

        if (currentSession?.user) {
          setSession(currentSession);
          const userObj = await buildUserObject(currentSession.user, currentSession);
          if (mounted) {
            setUser(userObj);
            const currentStored = getStoredActiveView();
            const resolved = resolveValidActiveView(currentStored, userObj?.role);
            setActiveViewState(resolved);
            try {
              localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, resolved);
            } catch {
              // ignore
            }
            setLoading(false);
          }
          if (event === 'SIGNED_IN') {
            void syncKommoRegistration();
          }
        } else if (event === 'SIGNED_OUT' || (!currentSession && event !== 'INITIAL_SESSION')) {
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      });
      subscription = authListener.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [buildUserObject, syncKommoRegistration]);

  // LOGIN: Directo con Supabase Auth
  const login = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Revisa tus variables de entorno.');
    }

    const cleanEmail = email.trim().toLowerCase();

    console.log('--- [INTENTO DE LOGIN CON SUPABASE AUTH] ---');
    console.log('Email:', cleanEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error('=== [SUPABASE AUTH LOGIN ERROR] ===');
      console.error('error.message:', error.message);
      console.error('error.code:', error.code);
      console.error('error.status:', error.status);
      console.error('error.name:', error.name);
      console.error('===================================');

      const friendlyMessage = formatSupabaseAuthError(error);
      const customErr = new Error(friendlyMessage);
      customErr.original = error;
      customErr.code = error.code;
      customErr.status = error.status;
      throw customErr;
    }

    console.log('=== [SUPABASE AUTH LOGIN SUCCESS] ===');
    console.log('data.user.id (UUID):', data?.user?.id);
    console.log('data.user.email:', data?.user?.email);
    console.log('data.session exists:', Boolean(data?.session));
    console.log('=====================================');

    if (data?.session) {
      setSession(data.session);
    }

    const userObj = await buildUserObject(data.user, data.session);
    setUser(userObj);
    const currentStored = getStoredActiveView();
    const resolved = resolveValidActiveView(currentStored, userObj?.role);
    setActiveViewState(resolved);
    try {
      localStorage.setItem(STORAGE_ACTIVE_VIEW_KEY, resolved);
    } catch {
      // ignore
    }
    return userObj;
  };

  // REGISTRO: Directo con Supabase Auth
  const register = async ({ name, email, phone, city, password, role = 'both' }) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Revisa tus variables de entorno.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = (phone || '').trim();
    const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
    const cleanCity = (city || 'Ciudad de México').trim();

    if (!cleanDigits || cleanDigits.length < 10) {
      throw new Error('El número de teléfono / WhatsApp es obligatorio y debe tener al menos 10 dígitos.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
          phone: cleanPhone,
          city: cleanCity,
          role: role || 'both',
        },
      },
    });

    if (error) {
      console.error('=== [SUPABASE AUTH ERROR EN SIGNUP] ===');
      console.error('error.message:', error.message);
      console.error('error.code:', error.code);
      console.error('error.status:', error.status);
      console.error('error.name:', error.name);
      console.error('error.details:', error.details);
      console.error('error.hint:', error.hint);
      console.error('======================================');

      const friendlyMessage = formatSupabaseAuthError(error);
      const customErr = new Error(friendlyMessage);
      customErr.original = error;
      customErr.code = error.code;
      customErr.status = error.status;
      throw customErr;
    }

    // Si existe sesión, guardar en estado
    // Si Supabase requiere confirmación de email y todavía no existe sesión, NO mostrar error.
    if (data?.session) {
      setSession(data.session);
    }

    const userObj = await buildUserObject(data.user, data.session);
    setUser(userObj);
    if (role === 'comprador') setActiveView('comprador');
    else setActiveView('vendedor');

    // Sincronización de nuevo registro con Kommo (Edge Function kommo-register-user)
    // Se ejecuta únicamente tras un registro exitoso utilizando la sesión autenticada.
    // Un eventual fallo o demora de Kommo NUNCA bloquea ni cancela el registro del usuario en Motoluv.
    await syncKommoRegistration();

    return {
      ...userObj,
      session: data.session,
      requiresEmailConfirmation: !data.session && !data.user?.confirmed_at,
    };
  };

  // OAUTH: Google, Apple / iCloud, Facebook
  const loginWithOAuth = async (provider) => {
    return await signInWithProvider(provider);
  };

  // LOGOUT: Directo con Supabase Auth
  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión en Supabase:', err);
    } finally {
      setSession(null);
      setUser(null);
    }
  };

  // Actualizar datos de perfil exclusivamente en public.profiles
  const updateProfile = async ({ name, phone, city, bank_clabe, bank_name, bank_holder, role } = {}) => {
    if (!user) throw new Error('Debes estar autenticado para actualizar tu perfil.');
    const updates = {};
    const safeTrim = (val) => (val != null ? String(val).trim() : '');

    if (name !== undefined) {
      updates.full_name = name != null ? safeTrim(name) : null;
    }

    const cleanNewPhone = phone !== undefined && phone != null ? safeTrim(phone) : '';
    const cleanOldPhone = user?.phone != null ? safeTrim(user.phone) : '';
    const isPhoneChanging = phone !== undefined && cleanOldPhone !== '' && cleanNewPhone !== cleanOldPhone;

    if (phone !== undefined) {
      updates.phone = phone != null ? safeTrim(phone) : null;
      if (isPhoneChanging) {
        updates.phone_updated_once = true;
        updates.phone_change_count = (user?.phone_change_count || 0) + 1;
      }
    }
    if (city !== undefined) {
      updates.city = city != null ? safeTrim(city) : null;
    }
    if (role !== undefined) updates.role = role;
    if (bank_clabe !== undefined) {
      updates.bank_clabe = bank_clabe != null ? safeTrim(bank_clabe) : null;
      updates.bank_updated_at = new Date().toISOString();
    }
    if (bank_name !== undefined) {
      updates.bank_name = bank_name != null ? safeTrim(bank_name) : null;
    }
    if (bank_holder !== undefined) {
      updates.bank_holder = bank_holder != null ? safeTrim(bank_holder) : null;
    }

    let updatedProfile = null;
    try {
      updatedProfile = await updateUserProfile(user.id, updates);
      logAuthDiagnostic('updateProfile_completado', { userId: user.id });
    } catch (err) {
      logAuthDiagnostic('updateProfile_error', {
        userId: user.id,
        message: err?.message || String(err),
      });
      console.error('[Error al actualizar perfil en Supabase]', err);
      throw err;
    }

    const resolvedName = updatedProfile?.full_name 
      || (name !== undefined ? (name != null ? safeTrim(name) : '') : (user?.full_name || user?.name || ''));

    const resolvedFirstName = updatedProfile?.first_name !== undefined
      ? updatedProfile.first_name
      : (user?.first_name || (resolvedName ? resolvedName.split(' ')[0] : null));

    const resolvedLastName = updatedProfile?.last_name !== undefined
      ? updatedProfile.last_name
      : (user?.last_name || null);

    const updated = {
      ...user,
      name: resolvedName,
      full_name: resolvedName,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      phone: updatedProfile?.phone !== undefined 
        ? updatedProfile.phone 
        : (phone !== undefined ? (phone != null ? safeTrim(phone) : null) : user?.phone),
      phone_updated_once: updatedProfile?.phone_updated_once !== undefined 
        ? updatedProfile.phone_updated_once 
        : (isPhoneChanging ? true : user?.phone_updated_once),
      phone_change_count: updatedProfile?.phone_change_count !== undefined 
        ? updatedProfile.phone_change_count 
        : (isPhoneChanging ? (user?.phone_change_count || 0) + 1 : user?.phone_change_count || 0),
      city: updatedProfile?.city !== undefined 
        ? updatedProfile.city 
        : (city !== undefined ? (city != null ? safeTrim(city) : null) : user?.city),
      role: updatedProfile?.role !== undefined ? updatedProfile.role : (role !== undefined ? role : user?.role),
      avatar_url: updatedProfile?.avatar_url || user?.avatar_url,
      bank_clabe: updatedProfile?.bank_clabe !== undefined 
        ? (updatedProfile.bank_clabe ? String(updatedProfile.bank_clabe) : '') 
        : (bank_clabe !== undefined ? (bank_clabe != null ? safeTrim(bank_clabe) : '') : user?.bank_clabe),
      bank_name: updatedProfile?.bank_name !== undefined 
        ? updatedProfile.bank_name 
        : (bank_name !== undefined ? (bank_name != null ? safeTrim(bank_name) : null) : user?.bank_name),
      bank_holder: updatedProfile?.bank_holder !== undefined 
        ? updatedProfile.bank_holder 
        : (bank_holder !== undefined ? (bank_holder != null ? safeTrim(bank_holder) : null) : user?.bank_holder),
      bank_updated_at: updatedProfile?.bank_updated_at || updates.bank_updated_at || user?.bank_updated_at,
      updated_at: updatedProfile?.updated_at || new Date().toISOString(),
    };

    setUser(updated);
    if (role && role !== user.role) {
      setActiveView(role === 'both' ? 'vendedor' : role);
    }
    return updated;
  };

  // Cambiar rol (comprador/vendedor/both)
  const updateRole = async (newRole) => {
    if (!user) return null;
    const updatedProfile = await updateUserProfile(user.id, { role: newRole });
    const updated = { 
      ...user, 
      role: updatedProfile?.role || newRole,
      updated_at: updatedProfile?.updated_at || new Date().toISOString(),
    };
    setUser(updated);
    setActiveView(newRole === 'both' ? 'vendedor' : newRole);
    return updated;
  };

  // Actualizar datos bancarios
  const updateBank = async ({ clabe, bank_name, holder } = {}) => {
    if (!user) throw new Error('Debes estar autenticado para actualizar tus datos bancarios.');
    const safeTrim = (val) => (val != null ? String(val).trim() : '');
    const updates = {
      bank_clabe: safeTrim(clabe),
      bank_name: safeTrim(bank_name),
      bank_holder: holder != null ? safeTrim(holder) : (user?.full_name || user?.name || ''),
      bank_updated_at: new Date().toISOString(),
    };
    const updatedProfile = await updateUserProfile(user.id, updates);
    const updated = { 
      ...user, 
      bank_clabe: updatedProfile?.bank_clabe ? String(updatedProfile.bank_clabe) : safeTrim(clabe),
      bank_name: updatedProfile?.bank_name !== undefined ? updatedProfile.bank_name : updates.bank_name,
      bank_holder: updatedProfile?.bank_holder !== undefined ? updatedProfile.bank_holder : updates.bank_holder,
      bank_updated_at: updatedProfile?.bank_updated_at || updates.bank_updated_at,
      updated_at: updatedProfile?.updated_at || new Date().toISOString(),
    };
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        loginWithOAuth,
        register,
        logout,
        updateProfile,
        updateRole,
        updateBank,
        setUser,
        activeView,
        setActiveView,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

