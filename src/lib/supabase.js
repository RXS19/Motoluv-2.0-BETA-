import { createClient } from '@supabase/supabase-js';

// Sanitize URL to avoid duplicate slashes or appended /rest/v1
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  supabaseUrl.startsWith('http')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Traduce y formatea los errores habituales de Supabase Auth a mensajes claros en español.
 */
export function formatSupabaseAuthError(err) {
  if (!err) return 'Ocurrió un error inesperado.';
  const msg = (err.message || String(err)).toLowerCase();

  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('user_already_exists')) {
    return 'Este correo electrónico ya está registrado. Por favor inicia sesión con tu contraseña.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak_password') || msg.includes('password is too short')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('email not confirmed') || msg.includes('not verified')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Límite de solicitudes alcanzado. Por favor espera unos minutos antes de intentar de nuevo.';
  }
  if (msg.includes('database error') || msg.includes('error saving new user')) {
    return 'Ocurrió un error al procesar el registro de usuario. Por favor intenta más tarde.';
  }
  if (msg.includes('invalid path') || msg.includes('request url')) {
    return 'Error en la conexión con el servidor. Verifica tu red.';
  }
  if (msg.includes('unable to validate email') || msg.includes('invalid email') || msg.includes('email address')) {
    return 'El formato de correo electrónico no es válido.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'No fue posible conectar con el servicio de autenticación. Revisa tu conexión a internet.';
  }

  return err.message || 'Error en la autenticación. Intenta nuevamente.';
}

/**
 * Iniciar sesión con proveedores OAuth (Google, Apple/iCloud, Facebook)
 */
export async function signInWithProvider(provider) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tus variables de entorno.');
  }

  const providerKey = provider === 'icloud' ? 'apple' : provider;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerKey,
    options: {
      redirectTo: `${window.location.origin}/panel`,
      queryParams: providerKey === 'google' ? {
        access_type: 'offline',
        prompt: 'select_account',
      } : undefined,
      scopes: providerKey === 'google' ? 'openid profile email' : undefined,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Extrae de forma segura los metadatos entregados por Google / Supabase Auth
 * para mapear first_name, last_name y full_name según las reglas de Motoluv.
 */
export function extractGoogleUserNames(authUser) {
  if (!authUser) return null;

  const metadata = authUser.user_metadata || {};
  const googleIdentity = authUser.identities?.find((id) => id.provider === 'google');
  const identityData = googleIdentity?.identity_data || {};

  // 1. Obtener apellido desde family_name y metadatos equivalentes
  const rawFamilyName = 
    metadata.family_name ??
    identityData.family_name ??
    metadata.familyname ??
    identityData.familyname ??
    metadata.last_name ??
    identityData.last_name ??
    metadata.lastname ??
    identityData.lastname ??
    metadata.surname ??
    identityData.surname ??
    null;

  const lastName = rawFamilyName != null && String(rawFamilyName).trim().length > 0
    ? String(rawFamilyName).trim()
    : null;

  // 2. Obtener nombre desde given_name y metadatos equivalentes
  const rawGivenName =
    metadata.given_name ??
    identityData.given_name ??
    metadata.givenname ??
    identityData.givenname ??
    metadata.first_name ??
    identityData.first_name ??
    metadata.firstname ??
    identityData.firstname ??
    null;

  const givenName = rawGivenName != null && String(rawGivenName).trim().length > 0
    ? String(rawGivenName).trim()
    : null;

  // 3. Obtener nombre completo actual (name o full_name de Google/Auth)
  const rawFullName =
    metadata.full_name ??
    identityData.full_name ??
    metadata.name ??
    identityData.name ??
    null;

  const fullName = rawFullName != null && String(rawFullName).trim().length > 0
    ? String(rawFullName).trim()
    : (givenName && lastName ? `${givenName} ${lastName}` : (givenName || 'Usuario'));

  // 4. Si givenName no viene explícito pero fullName sí, extraer el primer nombre
  const firstName = givenName || (fullName ? fullName.split(' ')[0] : null);

  return {
    first_name: firstName,
    last_name: lastName, // Si Google no proporciona apellido: null
    full_name: fullName,
  };
}

/**
 * Sincroniza los metadatos de Google OAuth hacia public.profiles y public.users
 * Si Google proporciona apellido, lo guarda en el campo existente.
 * Si no proporciona apellido, no bloquea el login ni genera error.
 */
export async function syncGoogleUserProfile(authUser) {
  if (!isSupabaseConfigured || !supabase || !authUser?.id) return null;

  const isGoogle = 
    authUser.app_metadata?.provider === 'google' ||
    authUser.app_metadata?.providers?.includes('google') ||
    authUser.identities?.some((id) => id.provider === 'google');

  if (!isGoogle) return null;

  const names = extractGoogleUserNames(authUser);
  if (!names) return null;

  const { first_name, last_name, full_name } = names;
  const metadata = authUser.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture || null;

  try {
    // 1. Consultar registro existente en public.profiles para no pisar datos
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    const profileUpdates = {
      updated_at: new Date().toISOString(),
    };

    if (!existingProfile?.full_name || existingProfile.full_name === 'Usuario Motoluv' || existingProfile.full_name === 'Usuario') {
      profileUpdates.full_name = full_name;
    }
    if (!existingProfile?.first_name && first_name) {
      profileUpdates.first_name = first_name;
    }
    // Si Google proporciona apellido y el perfil aún no tiene apellido guardado
    if (last_name && !existingProfile?.last_name) {
      profileUpdates.last_name = last_name;
    }
    if (avatarUrl && !existingProfile?.avatar_url) {
      profileUpdates.avatar_url = avatarUrl;
    }

    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        ...profileUpdates,
      }, { onConflict: 'id' });

    // 2. Sincronización hacia public.users existente
    try {
      const userUpdates = {
        updated_at: new Date().toISOString(),
      };
      if (first_name) userUpdates.first_name = first_name;
      if (last_name) userUpdates.last_name = last_name;

      await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', authUser.id);
    } catch (usersErr) {
      console.warn('[Sync Google public.users Notice]', usersErr?.message || usersErr);
    }

    logAuthDiagnostic('google_profile_synced', {
      userId: authUser.id,
      first_name,
      last_name,
      full_name,
    });
  } catch (err) {
    // REGLA CRÍTICA: NO bloquear el login bajo ninguna circunstancia
    console.warn('[Sync Google Profile Warning]', err?.message || err);
    logAuthDiagnostic('google_profile_sync_exception', {
      userId: authUser.id,
      message: err?.message || String(err),
    });
  }
}

/**
 * Diagnostic logger for Supabase user and profile lifecycle
 * Strict security: Never logs tokens, passwords or secrets
 */
export function logAuthDiagnostic(action, details = {}) {
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    const safeDetails = { ...details };
    // Explicitly delete any sensitive key if passed accidentally
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
    delete safeDetails.password;
    delete safeDetails.anon_key;
    delete safeDetails.service_role;
    console.log(`[MOTOLUV AUTH DIAGNOSTIC: ${action}]`, safeDetails);
  }
}

/**
 * Obtener perfil de usuario desde `public.profiles` con fallback a `auth.user.user_metadata`.
 *
 * PRIORIDAD DE DATOS:
 * 1. public.profiles (id = user.id) - Fuente de verdad principal
 * 2. auth.user.user_metadata - Fallback si profiles no existe aún
 * 3. Valores predeterminados / seguros
 *
 * NOTA: No permite que datos incompletos de public.users sobrescriban public.profiles.
 */
export async function fetchUserProfile(userId, userMetadata = null) {
  if (!userId) return null;

  let profile = null;

  if (isSupabaseConfigured && supabase) {
    // 1. Consultar tabla profiles como única fuente de verdad del perfil
    try {
      const { data: pData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        logAuthDiagnostic('fetch_profile_error', {
          userId,
          errorCode: profileError.code,
          errorMessage: profileError.message,
          details: profileError.details,
        });
        console.warn('[Supabase Profiles Warning]', profileError.message);
      } else if (pData) {
        profile = pData;
      }
    } catch (err) {
      console.warn('[Supabase Profiles Exception]', err?.message || err);
    }
  }

  // 2. Cascada de datos según prioridad: profiles -> userMetadata -> defaults
  const meta = userMetadata || {};

  const fullName = profile?.full_name 
    || profile?.name 
    || meta.full_name 
    || meta.name 
    || '';

  const phone = profile?.phone 
    || meta.phone 
    || meta.phone_number 
    || meta.phoneNumber 
    || '';

  const phoneUpdatedOnce = Boolean(
    profile?.phone_updated_once 
    ?? meta.phone_updated_once 
    ?? ((profile?.phone_change_count && profile.phone_change_count >= 1) || false)
  );

  const phoneChangeCount = profile?.phone_change_count 
    ?? meta.phone_change_count 
    ?? (phoneUpdatedOnce ? 1 : 0);

  const city = profile?.city 
    || meta.city 
    || 'Ciudad de México';

  const role = profile?.role 
    || meta.role 
    || 'both';

  const avatarUrl = profile?.avatar_url 
    || meta.avatar_url 
    || meta.picture 
    || '';

  const bankClabe = profile?.bank_clabe !== null && profile?.bank_clabe !== undefined
    ? String(profile.bank_clabe)
    : (meta.bank_clabe ? String(meta.bank_clabe) : '');

  const bankName = profile?.bank_name 
    || meta.bank_name 
    || '';

  const bankHolder = profile?.bank_holder 
    || meta.bank_holder 
    || fullName;

  const bankUpdatedAt = profile?.bank_updated_at 
    || meta.bank_updated_at 
    || null;

  const identityVerificationStatus = profile?.identity_verification_status || 'unverified';
  const rating = profile?.rating !== undefined && profile?.rating !== null ? Number(profile.rating) : null;
  const operations = profile?.operations !== undefined && profile?.operations !== null ? Number(profile.operations) : 0;
  const createdAt = profile?.created_at || new Date().toISOString();
  const updatedAt = profile?.updated_at || new Date().toISOString();

  const firstName = profile?.first_name 
    || meta.given_name 
    || meta.first_name 
    || (fullName ? fullName.split(' ')[0] : null);

  const lastName = profile?.last_name 
    || meta.family_name 
    || meta.last_name 
    || null;

  const merged = {
    id: userId,
    nid: profile?.nid ?? meta?.nid ?? null,
    full_name: fullName,
    name: fullName, // Compatibilidad total con vistas que usen user.name
    first_name: firstName,
    last_name: lastName,
    phone,
    phone_updated_once: phoneUpdatedOnce,
    phone_change_count: phoneChangeCount,
    city,
    role,
    avatar_url: avatarUrl,
    bank_clabe: bankClabe,
    bank_name: bankName,
    bank_holder: bankHolder,
    bank_updated_at: bankUpdatedAt,
    identity_verification_status: identityVerificationStatus,
    rating,
    operations,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  logAuthDiagnostic('profile_cargado_exitoso', {
    userId: merged.id,
    hasFullName: Boolean(merged.full_name),
    hasPhone: Boolean(merged.phone),
    role: merged.role,
    source: profile ? 'profiles' : 'metadata/default',
  });

  return merged;
}

/**
 * Actualizar datos del usuario exclusivamente en `public.profiles`.
 *
 * REGLAS ARQUITECTÓNICAS CRÍTICAS:
 * 1. public.profiles es la ÚNICA fuente de verdad del perfil.
 * 2. NO actualizar public.users (no contiene full_name, city, role, bank_clabe, etc.).
 * 3. NO llamar a supabase.auth.updateUser() para evitar onAuthStateChange y segundas sincronizaciones.
 * 4. bank_clabe es NUMERIC: Si está vacío, enviar null (NUNCA "").
 * 5. NUNCA modificar public.register_users (inmutable).
 * 6. Devuelve el registro de perfil actualizado directamente desde public.profiles.
 */
export async function updateUserProfile(userId, updates) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    throw new Error('Supabase no está configurado para actualizar el perfil.');
  }

  // 1. Mapear y sanear campos para public.profiles
  const resolvedFullName = updates.full_name !== undefined
    ? (updates.full_name != null ? String(updates.full_name).trim() : null)
    : updates.name !== undefined
    ? (updates.name != null ? String(updates.name).trim() : null)
    : undefined;

  const cleanData = {};

  if (resolvedFullName !== undefined) {
    cleanData.full_name = resolvedFullName;
    const nameParts = resolvedFullName ? resolvedFullName.split(' ').filter(Boolean) : [];
    cleanData.first_name = updates.first_name !== undefined
      ? (updates.first_name != null ? String(updates.first_name).trim() || null : null)
      : (nameParts[0] || null);
    cleanData.last_name = updates.last_name !== undefined
      ? (updates.last_name != null ? String(updates.last_name).trim() || null : null)
      : (nameParts.slice(1).join(' ') || null);
  } else {
    if (updates.first_name !== undefined) {
      cleanData.first_name = updates.first_name != null ? String(updates.first_name).trim() || null : null;
    }
    if (updates.last_name !== undefined) {
      cleanData.last_name = updates.last_name != null ? String(updates.last_name).trim() || null : null;
    }
  }

  if (updates.phone !== undefined) {
    cleanData.phone = updates.phone ? String(updates.phone).trim() : null;
  }
  if (updates.phone_updated_once !== undefined) {
    cleanData.phone_updated_once = Boolean(updates.phone_updated_once);
  }
  if (updates.phone_change_count !== undefined) {
    cleanData.phone_change_count = Number(updates.phone_change_count);
  }
  if (updates.city !== undefined) {
    cleanData.city = updates.city ? String(updates.city).trim() : null;
  }
  if (updates.role !== undefined) {
    cleanData.role = updates.role;
  }
  if (updates.avatar_url !== undefined) {
    cleanData.avatar_url = updates.avatar_url;
  }
  if (updates.bank_name !== undefined) {
    cleanData.bank_name = updates.bank_name ? String(updates.bank_name).trim() : null;
  }
  if (updates.bank_holder !== undefined) {
    cleanData.bank_holder = updates.bank_holder ? String(updates.bank_holder).trim() : null;
  }
  if (updates.bank_updated_at !== undefined) {
    cleanData.bank_updated_at = updates.bank_updated_at;
  }

  // Manejo estricto de bank_clabe como NUMERIC
  if (updates.bank_clabe !== undefined) {
    const clabeStr = String(updates.bank_clabe).replace(/\D/g, '').trim();
    if (clabeStr.length > 0) {
      cleanData.bank_clabe = clabeStr;
    } else {
      cleanData.bank_clabe = null; // NUMERIC en Postgres debe recibir null, nunca ""
    }
  }

  cleanData.updated_at = new Date().toISOString();

  // 2. Actualizar EXCLUSIVAMENTE public.profiles
  try {
    const { data: updatedProfile, error: pErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...cleanData,
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (pErr) {
      logAuthDiagnostic('update_profiles_table_error', {
        userId,
        message: pErr.message,
        code: pErr.code,
        details: pErr.details,
      });
      console.error('[Supabase Profiles Table Error]', pErr.message, pErr.details || '');
      throw new Error(pErr.message || 'Error al actualizar perfil en Supabase');
    }

    logAuthDiagnostic('profile_actualizado_exitoso', {
      userId: updatedProfile?.id || userId,
      full_name: updatedProfile?.full_name,
      phone: updatedProfile?.phone,
      role: updatedProfile?.role,
    });

    return updatedProfile;
  } catch (err) {
    logAuthDiagnostic('update_profiles_exception', {
      userId,
      message: err?.message || String(err),
    });
    console.error('[Supabase Profiles Update Exception]', err);
    throw err;
  }
}
