import axios from 'axios';
import { resolveSafeImageUrl } from '../utils/imageFallback';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) || '';
export const API = `${BACKEND_URL}/api`;

// Helper: resolve relative image URLs with safe fallbacks
export const resolveImageUrl = (url, fallbackType = 'moto') => resolveSafeImageUrl(url, fallbackType);

const api = axios.create({ baseURL: API, timeout: 8000 });

api.interceptors.request.use(async (config) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

const formatMotoRecord = (m) => {
  if (!m) return null;
  let imgs = [];
  if (Array.isArray(m.images) && m.images.length > 0) {
    imgs = m.images.filter(Boolean);
  } else if (typeof m.images === 'string' && m.images.trim()) {
    const trimmed = m.images.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) imgs = parsed.filter(Boolean);
      } catch {}
    } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      imgs = trimmed.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      imgs = [trimmed];
    }
  }
  if (imgs.length === 0 && m.image) {
    imgs = [m.image];
  }
  
  const isApartada = m.apartado_status === 'APARTADA' || Boolean(m.is_apartada);

  return {
    id: String(m.id),
    title: m.title || `${m.brand || ''} ${m.model || ''} ${m.year || ''}`.trim(),
    brand: m.brand || '',
    model: m.model || '',
    year: Number(m.year) || 0,
    price: Number(m.price) || 0,
    km: Number(m.km) || 0,
    engine: m.engine || '',
    color: m.color || '',
    category: m.category || 'Naked',
    city: m.city || m.location || 'Ciudad de México',
    location: m.location || m.city || 'Ciudad de México',
    description: m.description || '',
    images: imgs,
    image: imgs[0] || m.image || null,
    score: m.score !== undefined && m.score !== null ? Number(m.score) : null,
    score_details: m.score_details || m.scoreDetails || {},
    scoreDetails: m.scoreDetails || m.score_details || {},
    rating: m.rating !== undefined && m.rating !== null ? Number(m.rating) : null,
    views: Number(m.views) || 0,
    featured: Boolean(m.featured),
    status: m.status || 'PUBLICADA',
    apartado_status: m.apartado_status || (isApartada ? 'APARTADA' : 'DISPONIBLE'),
    is_apartada: isApartada,
    owner_id: m.owner_id || null,
    owner_name: m.owner_name || null,
    owner_rating: m.owner_rating !== undefined && m.owner_rating !== null ? Number(m.owner_rating) : null,
    owner_operations: m.owner_operations !== undefined && m.owner_operations !== null ? Number(m.owner_operations) : 0,
    seller_identity_verification_status: m.seller_identity_verification_status || m.identity_verification_status || null,
    identity_verification_status: m.identity_verification_status || m.seller_identity_verification_status || null,
    created_at: m.created_at || new Date().toISOString(),
    updated_at: m.updated_at || new Date().toISOString(),
  };
};

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  oauth: (data) => api.post('/auth/oauth', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateRole: (role) => api.patch('/auth/role', { role }).then((r) => r.data),
  updateBank: (data) => api.patch('/auth/bank', data).then((r) => r.data),
};

export const motoApi = {
  list: async (params = {}) => {
    // 1. Prioridad: Consultar directamente en Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('motos').select('*');

        if (params.status) {
          query = query.eq('status', params.status);
        } else {
          query = query.eq('status', 'PUBLICADA');
        }
        if (params.featured === true || params.featured === 'true') {
          query = query.eq('featured', true);
        }
        if (params.brand && params.brand !== 'all') {
          query = query.eq('brand', params.brand);
        }
        if (params.category && params.category !== 'all') {
          query = query.eq('category', params.category);
        }
        if (params.city && params.city !== 'all') {
          query = query.or(`city.eq.${params.city},location.eq.${params.city}`);
        }
        if (params.limit) {
          query = query.limit(parseInt(String(params.limit), 10));
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          let list = data
            .map(formatMotoRecord)
            .filter((m) => m && (params.status ? m.status === params.status : m.status === 'PUBLICADA'));

          if (params.q) {
            const qStr = String(params.q).toLowerCase();
            list = list.filter((m) => `${m.brand} ${m.model}`.toLowerCase().includes(qStr));
          }
          return list;
        }
      } catch (err) {
        console.warn('Error querying Supabase motos:', err);
      }
    }

    // 2. Intentar backend /api/motos si está disponible
    try {
      const res = await api.get('/motos', { params });
      if (Array.isArray(res.data)) {
        return res.data
          .map(formatMotoRecord)
          .filter((m) => m && (params.status ? m.status === params.status : m.status === 'PUBLICADA'));
      }
    } catch (err) {
      console.warn('Backend /motos request failed:', err?.message);
    }

    // 3. Si no hay datos en BD o backend, retornar arreglo vacío (NUNCA datos mock)
    return [];
  },

  get: async (id) => {
    if (!id) return null;

    // 1. Prioridad: Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .eq('id', String(id))
          .maybeSingle();

        if (!error && data) {
          const record = formatMotoRecord(data);
          if (data.owner_id) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('identity_verification_status, rating, operations, full_name')
                .eq('id', String(data.owner_id))
                .maybeSingle();

              if (profileData) {
                record.seller_identity_verification_status = profileData.identity_verification_status || 'unverified';
                record.identity_verification_status = profileData.identity_verification_status || 'unverified';
                if (profileData.rating !== undefined && profileData.rating !== null) {
                  record.owner_rating = Number(profileData.rating);
                }
                if (profileData.operations !== undefined && profileData.operations !== null) {
                  record.owner_operations = Number(profileData.operations);
                }
                if (profileData.full_name && !record.owner_name) {
                  record.owner_name = profileData.full_name;
                }
              }
            } catch (pErr) {
              console.warn('Error fetching seller profile from Supabase:', pErr);
            }
          }
          return record;
        }
      } catch (err) {
        console.warn('Error fetching moto from Supabase:', err);
      }
    }

    // 2. Intentar backend
    try {
      const res = await api.get(`/motos/${id}`);
      if (res.data && res.data.id) {
        return formatMotoRecord(res.data);
      }
    } catch (err) {
      console.warn('Backend /motos/:id request failed:', err?.message);
    }

    // 3. No encontrado: devolver null (NUNCA fallback)
    return null;
  },

  getById: async (id) => motoApi.get(id),

  create: async (data) => {
    let sessionUser = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        sessionUser = session?.user || null;
      } catch {}
    }

    const defaultImg = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800';
    const imgs = Array.isArray(data.images) && data.images.length > 0 
      ? data.images 
      : (data.image ? [data.image] : [defaultImg]);

    const motoId = `moto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const motoRecord = {
      id: motoId,
      title: `${data.brand || ''} ${data.model || ''} ${data.year || ''}`.trim(),
      brand: data.brand || 'Motocicleta',
      model: data.model || '',
      year: Number(data.year) || new Date().getFullYear(),
      price: Number(data.price) || 0,
      km: Number(data.km) || 0,
      engine: data.engine || '',
      color: data.color || '',
      category: data.category || 'Naked',
      city: data.city || 'Ciudad de México',
      location: data.city || 'Ciudad de México',
      description: data.description || '',
      images: imgs,
      image: imgs[0] || defaultImg,
      owner_id: sessionUser?.id || data.owner_id || null,
      owner_name: sessionUser?.user_metadata?.full_name || sessionUser?.email?.split('@')[0] || 'Vendedor',
      views: 0,
      featured: false,
      status: 'EN REVISIÓN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Guardar en Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: insertedData, error: supaErr } = await supabase
          .from('motos')
          .insert([motoRecord])
          .select('*')
          .single();

        if (!supaErr && insertedData) {
          return formatMotoRecord(insertedData);
        }
      } catch (supaErr) {
        console.warn('Supabase direct insert error:', supaErr);
      }
    }

    // 2. Intentar backend
    try {
      const res = await api.post('/motos', data);
      if (res.data) {
        return formatMotoRecord(res.data);
      }
    } catch (backendErr) {
      console.warn('Backend /motos failed:', backendErr?.message);
    }

    return motoRecord;
  },

  update: async (id, data) => {
    // 1. Bloqueo de edición si la moto ya está en estado PUBLICADA
    const isEditingDetails = data && Object.keys(data).some(k => 
      ['brand', 'model', 'year', 'km', 'price', 'color', 'engine', 'category', 'city', 'location', 'description', 'images', 'image'].includes(k)
    );

    if (isEditingDetails) {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: currentMoto } = await supabase
            .from('motos')
            .select('status')
            .eq('id', String(id))
            .single();

          const currentStatus = currentMoto?.status;
          if (currentStatus === 'PUBLICADA') {
            const err = new Error('Esta motocicleta ya se encuentra PUBLICADA. La edición directa está bloqueada por seguridad. Por favor, contacta a Soporte Motoluv.');
            err.code = 'MOTO_PUBLISHED_EDIT_LOCKED';
            throw err;
          }
        } catch (statusErr) {
          if (statusErr?.code === 'MOTO_PUBLISHED_EDIT_LOCKED') {
            throw statusErr;
          }
          console.warn('Advertencia al validar estatus de moto:', statusErr?.message);
        }
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (data.status === 'Rechazada' || data.status === 'rejected') {
          await supabase.from('motos').delete().eq('id', String(id));
          return { deleted: true, status: 'Rechazada' };
        } else {
          const { data: updatedData, error } = await supabase
            .from('motos')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', String(id))
            .select('*')
            .single();

          if (!error && updatedData) {
            return formatMotoRecord(updatedData);
          }
        }
      } catch (err) {
        if (err?.code === 'MOTO_PUBLISHED_EDIT_LOCKED') throw err;
        console.warn('Error updating moto in Supabase:', err);
      }
    }

    try {
      const res = await api.patch(`/motos/${id}`, data);
      return res.data;
    } catch (err) {
      if (err?.code === 'MOTO_PUBLISHED_EDIT_LOCKED') throw err;
      if (data.status === 'Rechazada' || data.status === 'rejected') {
        return { deleted: true, status: 'Rechazada' };
      }
      throw err;
    }
  },

  remove: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('motos').delete().eq('id', String(id));
      if (error) {
        console.warn('Error deleting moto from Supabase:', error);
        const fullErrStr = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`.toLowerCase();
        if (
          fullErrStr.includes('apartad') ||
          fullErrStr.includes('vigente') ||
          fullErrStr.includes('foreign key') ||
          fullErrStr.includes('23503') ||
          fullErrStr.includes('violates foreign key') ||
          error.code === '23503' ||
          error.code === 'P0001'
        ) {
          throw new Error('No se puede eliminar esta publicación. Esta motocicleta tiene un apartado vigente y no puede eliminarse mientras esté activo.');
        }
        throw new Error(error.message || 'No se puede eliminar esta publicación.');
      }
      return { ok: true };
    }

    try {
      const res = await api.delete(`/motos/${id}`);
      return res.data;
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '';
      const detailLower = detail.toLowerCase();
      if (
        detailLower.includes('apartad') ||
        detailLower.includes('vigente') ||
        detailLower.includes('foreign key') ||
        detailLower.includes('23503')
      ) {
        throw new Error('No se puede eliminar esta publicación. Esta motocicleta tiene un apartado vigente y no puede eliminarse mientras esté activo.');
      }
      if (err?.response?.status === 400 || err?.response?.data?.detail) {
        throw new Error(err.response?.data?.detail || 'No se puede eliminar la publicación');
      }
      throw err;
    }
  },

  mine: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('motos')
            .select('*')
            .eq('owner_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            return data.map(formatMotoRecord);
          }
        }
      } catch (err) {
        console.warn('Error querying user motos in Supabase:', err);
      }
    }

    try {
      const res = await api.get('/my/motos');
      return Array.isArray(res.data) ? res.data.map(formatMotoRecord) : [];
    } catch {
      return [];
    }
  },

  incrementViews: async (id) => {
    if (!id) return null;
    const motoId = String(id);

    // 1. Supabase RPC incremento atómico (views = COALESCE(views, 0) + 2)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('increment_moto_views', {
          p_moto_id: motoId,
        });

        if (!error && typeof data === 'number') {
          return data;
        }
        if (error) {
          console.warn('Error en llamada Supabase RPC increment_moto_views:', error);
        }
      } catch (err) {
        console.warn('Error en llamada Supabase RPC increment_moto_views:', err);
      }
    }

    // 2. Endpoint backend /api/motos/:id/views
    try {
      const res = await api.post(`/motos/${motoId}/views`);
      if (res?.data && typeof res.data.views === 'number') {
        return res.data.views;
      }
    } catch (backendErr) {
      console.warn('Backend views increment failed:', backendErr?.message);
    }

    return null;
  },
};

export const getMotoCertificationAndAppointment = async (motoId) => {
  if (!motoId) return null;
  const motoIdStr = String(motoId);

  // 1. Check in Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const [apartadosRes, motoRes] = await Promise.all([
        supabase
          .from('apartados')
          .select('id, moto_id, certification_appointment_at, certification_appointment_status, certification_workshop, certification_workshop_id, certification_status, status, created_at')
          .eq('moto_id', motoIdStr)
          .order('created_at', { ascending: false }),
        supabase
          .from('motos')
          .select('*')
          .eq('id', motoIdStr)
          .single(),
      ]);

      const apartadosList = Array.isArray(apartadosRes.data) ? apartadosRes.data : [];
      const motoData = motoRes.data || null;

      let approvedCert = null;
      let rejectedCert = null;
      let scheduledApp = null;
      let completedApp = null;
      let cancelledApp = null;

      for (const ap of apartadosList) {
        const appStatus = String(ap.certification_appointment_status || '').toUpperCase();
        const certStatus = String(ap.certification_status || '').toUpperCase();
        const apStatus = String(ap.status || '').toUpperCase();

        if (certStatus === 'APROBADA' || certStatus === 'CERTIFICADA') {
          if (!approvedCert) approvedCert = ap;
        } else if (certStatus === 'RECHAZADA' || certStatus === 'NO_APROBADA') {
          if (!rejectedCert) rejectedCert = ap;
        }

        // Active scheduled appointment from an active transaction
        if (appStatus === 'PROGRAMADA' && ap.certification_appointment_at) {
          if (!scheduledApp && apStatus !== 'EXPIRADO' && apStatus !== 'CANCELADO') {
            scheduledApp = ap;
          }
        }

        if (appStatus === 'COMPLETADA') {
          if (!completedApp) completedApp = ap;
        }

        if ((appStatus === 'CANCELADA' || appStatus === 'NO_PRESENTADO' || appStatus === 'EXPIRADA' || apStatus === 'EXPIRADO') && !cancelledApp) {
          cancelledApp = ap;
        }
      }

      if (motoData) {
        const mCertStatus = String(motoData.certification_status || motoData.certified_status || '').toUpperCase();
        const mAppStatus = String(motoData.certification_appointment_status || '').toUpperCase();

        if (mCertStatus === 'APROBADA' || mCertStatus === 'CERTIFICADA' || (typeof motoData.score === 'number' && motoData.score >= 80)) {
          if (!approvedCert) {
            approvedCert = {
              certification_status: 'APROBADA',
              certification_appointment_status: 'COMPLETADA',
              certification_appointment_at: motoData.certification_appointment_at || motoData.certified_date || null,
              certification_workshop: motoData.certification_workshop || motoData.certifier || 'Taller Mecánico Certificado Motoluv',
              certification_workshop_id: motoData.certification_workshop_id || null,
            };
          }
        } else if (mCertStatus === 'RECHAZADA' || mCertStatus === 'NO_APROBADA') {
          if (!rejectedCert) {
            rejectedCert = {
              certification_status: 'RECHAZADA',
              certification_appointment_status: 'COMPLETADA',
              certification_appointment_at: motoData.certification_appointment_at || null,
              certification_workshop: motoData.certification_workshop || 'Taller Mecánico Certificado Motoluv',
              certification_workshop_id: motoData.certification_workshop_id || null,
            };
          }
        }

        if (mAppStatus === 'PROGRAMADA' && motoData.certification_appointment_at && !scheduledApp) {
          scheduledApp = {
            certification_appointment_status: 'PROGRAMADA',
            certification_appointment_at: motoData.certification_appointment_at,
            certification_workshop: motoData.certification_workshop || 'Taller Mecánico Certificado Motoluv',
            certification_workshop_id: motoData.certification_workshop_id || null,
            certification_status: motoData.certification_status || 'PENDIENTE',
          };
        }
      }

      if (approvedCert) {
        return {
          isCertified: true,
          isRejected: false,
          isProgrammed: false,
          isCancelled: false,
          isCompleted: true,
          certification_status: 'APROBADA',
          certification_appointment_status: 'COMPLETADA',
          certification_appointment_at: approvedCert.certification_appointment_at || null,
          certification_workshop: approvedCert.certification_workshop || 'Taller Mecánico Certificado Motoluv',
          certification_workshop_id: approvedCert.certification_workshop_id || null,
        };
      }

      if (rejectedCert) {
        return {
          isCertified: false,
          isRejected: true,
          isProgrammed: false,
          isCancelled: false,
          isCompleted: true,
          certification_status: 'RECHAZADA',
          certification_appointment_status: 'COMPLETADA',
          certification_appointment_at: rejectedCert.certification_appointment_at || null,
          certification_workshop: rejectedCert.certification_workshop || 'Taller Mecánico Certificado Motoluv',
          certification_workshop_id: rejectedCert.certification_workshop_id || null,
        };
      }

      if (scheduledApp) {
        return {
          isCertified: false,
          isRejected: false,
          isProgrammed: true,
          isCancelled: false,
          isCompleted: false,
          certification_status: scheduledApp.certification_status || 'PENDIENTE',
          certification_appointment_status: 'PROGRAMADA',
          certification_appointment_at: scheduledApp.certification_appointment_at,
          certification_workshop: scheduledApp.certification_workshop || 'Taller Mecánico Certificado Motoluv',
          certification_workshop_id: scheduledApp.certification_workshop_id || null,
        };
      }

      if (completedApp) {
        return {
          isCertified: false,
          isRejected: false,
          isProgrammed: false,
          isCancelled: false,
          isCompleted: true,
          certification_status: 'PENDIENTE',
          certification_appointment_status: 'COMPLETADA',
          certification_appointment_at: completedApp.certification_appointment_at || null,
          certification_workshop: completedApp.certification_workshop || 'Taller Mecánico Certificado Motoluv',
          certification_workshop_id: completedApp.certification_workshop_id || null,
        };
      }

      if (cancelledApp) {
        return {
          isCertified: false,
          isRejected: false,
          isProgrammed: false,
          isCancelled: true,
          isCompleted: false,
          certification_status: 'PENDIENTE',
          certification_appointment_status: cancelledApp.certification_appointment_status || 'CANCELADA',
          certification_appointment_at: cancelledApp.certification_appointment_at || null,
          certification_workshop: cancelledApp.certification_workshop || null,
          certification_workshop_id: cancelledApp.certification_workshop_id || null,
        };
      }

      return {
        isCertified: false,
        isRejected: false,
        isProgrammed: false,
        isCancelled: false,
        isCompleted: false,
        certification_status: 'PENDIENTE',
        certification_appointment_status: 'SIN CITA',
        certification_appointment_at: null,
        certification_workshop: null,
        certification_workshop_id: null,
      };
    } catch (err) {
      console.warn('Error querying moto certification in Supabase:', err);
    }
  }

  return null;
};

export const apartadoApi = {
  create: async ({ moto_id }) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('Debes iniciar sesión para realizar un apartado.');

        const generatedNod = `NOD-${Math.floor(100000 + Math.random() * 900000)}`;

        // Check if the motorcycle already has an existing appointment or completed certification
        let existingCert = null;
        try {
          existingCert = await getMotoCertificationAndAppointment(moto_id);
        } catch (e) {
          console.warn('Error fetching existing moto cert during apartado create:', e);
        }

        const appointmentFields = {};
        if (existingCert?.isCertified) {
          appointmentFields.certification_status = existingCert.certification_status || 'APROBADA';
          appointmentFields.certification_appointment_status = 'COMPLETADA';
          if (existingCert.certification_appointment_at) {
            appointmentFields.certification_appointment_at = existingCert.certification_appointment_at;
          }
          if (existingCert.certification_workshop) {
            appointmentFields.certification_workshop = existingCert.certification_workshop;
          }
          if (existingCert.certification_workshop_id) {
            appointmentFields.certification_workshop_id = existingCert.certification_workshop_id;
          }
        } else if (existingCert?.isProgrammed && existingCert.certification_appointment_at) {
          appointmentFields.certification_appointment_status = 'PROGRAMADA';
          appointmentFields.certification_appointment_at = existingCert.certification_appointment_at;
          appointmentFields.certification_workshop = existingCert.certification_workshop;
          appointmentFields.certification_workshop_id = existingCert.certification_workshop_id;
          appointmentFields.certification_status = existingCert.certification_status || 'PENDIENTE';
        }

        // Insert into public.apartados with buyer_id, moto_id, status, nod and synchronized appointment
        let data = null;
        let error = null;

        try {
          const res = await supabase
            .from('apartados')
            .insert([
              {
                buyer_id: session.user.id,
                moto_id: String(moto_id),
                status: 'REALIZADO',
                nod: generatedNod,
                ...appointmentFields,
              },
            ])
            .select('*, moto:motos(*)')
            .single();
          data = res.data;
          error = res.error;
        } catch (insertErr) {
          // If inserting with nod fails (e.g. column not in schema), retry without nod
          const fallbackRes = await supabase
            .from('apartados')
            .insert([
              {
                buyer_id: session.user.id,
                moto_id: String(moto_id),
                status: 'REALIZADO',
                ...appointmentFields,
              },
            ])
            .select('*, moto:motos(*)')
            .single();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error && error.message?.includes('nod')) {
          const fallbackRes = await supabase
            .from('apartados')
            .insert([
              {
                buyer_id: session.user.id,
                moto_id: String(moto_id),
                status: 'REALIZADO',
                ...appointmentFields,
              },
            ])
            .select('*, moto:motos(*)')
            .single();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (error) {
          console.error('Error creating apartado in Supabase:', error);
          throw error;
        }

        if (data && !data.nod) {
          data.nod = generatedNod;
        }

        // Automatic notification to seller
        try {
          const sellerId = data?.moto?.owner_id;
          if (sellerId) {
            const motoTitle = `${data.moto?.brand || ''} ${data.moto?.model || ''}`.trim() || 'tu motocicleta';
            await supabase
              .from('notifications')
              .insert([
                {
                  recipient_id: sellerId,
                  type: 'APARTADO_RECIBIDO',
                  title: '¡Apartado recibido!',
                  body: `Se ha registrado un apartado para ${motoTitle}. Es momento de agendar la inspección técnica en un taller certificado.`,
                  moto_id: String(moto_id),
                  apartado_id: String(data.id),
                },
              ]);
          }
        } catch (notifErr) {
          console.warn('Could not insert notification into Supabase:', notifErr);
        }

        return data;
      } catch (err) {
        console.warn('Supabase apartado create error:', err);
        throw err;
      }
    }

    return api.post('/apartados', { moto_id }).then((r) => r.data);
  },

  mine: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('apartados')
            .select('*, moto:motos(*)')
            .eq('buyer_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            const missingMotoIds = [...new Set(
              data.filter((a) => (!a.moto || (Array.isArray(a.moto) && a.moto.length === 0)) && a.moto_id)
                .map((a) => String(a.moto_id))
            )];
            const fetchedMotosMap = {};
            if (missingMotoIds.length > 0) {
              try {
                const { data: mData } = await supabase
                  .from('motos')
                  .select('*')
                  .in('id', missingMotoIds);
                if (Array.isArray(mData)) {
                  mData.forEach((m) => {
                    fetchedMotosMap[String(m.id)] = formatMotoRecord(m);
                  });
                }
              } catch (mErr) {
                console.warn('Error fetching missing motos for apartados:', mErr);
              }
            }

            const sellerIds = [...new Set(data.map((a) => {
              const rawMoto = a.moto ? (Array.isArray(a.moto) ? a.moto[0] : a.moto) : null;
              const motoObj = rawMoto ? formatMotoRecord(rawMoto) : (fetchedMotosMap[String(a.moto_id)] || null);
              return motoObj?.owner_id;
            }).filter(Boolean))];
            const profilesMap = {};
            if (sellerIds.length > 0) {
              try {
                const { data: profs } = await supabase
                  .from('profiles')
                  .select('id, name, full_name, email, identity_verification_status')
                  .in('id', sellerIds);
                if (Array.isArray(profs)) {
                  profs.forEach((p) => {
                    profilesMap[p.id] = {
                      name: p.full_name || p.name || (p.email ? p.email.split('@')[0] : null),
                      is_verified: p.identity_verification_status === 'verified',
                    };
                  });
                }
              } catch (e) {
                console.warn('Error fetching seller profiles:', e);
              }
            }

            // 1 NOD = 1 operación = 1 contrato
            // Query contracts and operation_tracking strictly by NOD (never by moto_id)
            const validNods = [...new Set(data.map((a) => a.nod).filter(Boolean))];
            const contractsMap = {};
            const trackingMap = {};
            if (validNods.length > 0) {
              try {
                const { data: cData } = await supabase
                  .from('contracts')
                  .select('*')
                  .in('nod', validNods);
                if (Array.isArray(cData)) {
                  cData.forEach((c) => {
                    if (c.nod) contractsMap[c.nod] = c;
                  });
                }
              } catch (cErr) {
                console.warn('Error querying contracts by NOD:', cErr);
              }

              try {
                const { data: tData } = await supabase
                  .from('operation_tracking')
                  .select('*')
                  .in('nod', validNods);
                if (Array.isArray(tData)) {
                  tData.forEach((t) => {
                    if (t.nod) trackingMap[t.nod] = t;
                  });
                }
              } catch (tErr) {
                console.warn('Error querying operation_tracking by NOD:', tErr);
              }
            }

            const mappedApartados = data.map((a) => {
              const rawMoto = a.moto ? (Array.isArray(a.moto) ? a.moto[0] : a.moto) : null;
              const motoObj = rawMoto ? formatMotoRecord(rawMoto) : (fetchedMotosMap[String(a.moto_id)] || null);
              const profileInfo = profilesMap[motoObj?.owner_id];
              const isVerified = Boolean(
                profileInfo?.is_verified ||
                motoObj?.seller_identity_verification_status === 'verified' ||
                motoObj?.identity_verification_status === 'verified' ||
                motoObj?.is_verified
              );

              const itemNod = a.nod || null;
              const contractObj = itemNod ? (contractsMap[itemNod] || a.contract || null) : (a.contract || null);
              const trackingObj = itemNod ? (trackingMap[itemNod] || a.tracking || a.operation_tracking || null) : (a.tracking || a.operation_tracking || null);

              return {
                ...a,
                moto: motoObj || a.moto,
                nod: itemNod,
                apartado: a,
                contract: contractObj,
                tracking: trackingObj,
                contract_status: contractObj?.contract_status || a.contract_status || null,
                payment_status: trackingObj?.payment_status || a.payment_status || null,
                authorization_status: trackingObj?.authorization_status || trackingObj?.auth_status || a.authorization_status || null,
                transfer_status: trackingObj?.transfer_status || a.transfer_status || null,
                delivery_status: trackingObj?.delivery_status || a.delivery_status || null,
                moto_brand: a.moto_brand || motoObj?.brand,
                moto_model: a.moto_model || motoObj?.model,
                moto_year: a.moto_year || motoObj?.year,
                moto_price: a.moto_price || motoObj?.price,
                moto_image: motoObj?.images?.[0] || motoObj?.image || a.moto_image,
                seller_name: profileInfo?.name || motoObj?.owner_name || 'Vendedor Motoluv',
                seller_is_verified: isVerified,
                buyer_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Comprador',
                certification_appointment_at: a.certification_appointment_at || null,
                certification_appointment_status: a.certification_appointment_status || 'Pendiente',
                certification_workshop: a.certification_workshop || null,
                certification_workshop_id: a.certification_workshop_id || null,
                certification_status: a.certification_status || 'PENDIENTE',
              };
            });

            // Asynchronously sync operational notifications for completed stages
            try {
              notificationApi.syncOperations(mappedApartados);
            } catch (syncErr) {
              console.warn('Error syncing operation notifications:', syncErr);
            }

            return mappedApartados;
          }
        }
      } catch (err) {
        console.warn('Error querying apartados from Supabase:', err);
      }
    }

    try {
      const res = await api.get('/my/apartados');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getByMoto: async (motoId) => {
    if (!motoId) return null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          // 1. Check as buyer
          const { data: buyerData, error: buyerErr } = await supabase
            .from('apartados')
            .select('*')
            .eq('buyer_id', session.user.id)
            .eq('moto_id', String(motoId))
            .order('created_at', { ascending: false })
            .limit(1);

          if (!buyerErr && Array.isArray(buyerData) && buyerData.length > 0) {
            const item = buyerData[0];
            const mCert = await getMotoCertificationAndAppointment(motoId);
            if (mCert?.isProgrammed || mCert?.isCertified) {
              item.certification_appointment_at = mCert.certification_appointment_at;
              item.certification_appointment_status = mCert.certification_appointment_status;
              item.certification_workshop = mCert.certification_workshop;
              item.certification_workshop_id = mCert.certification_workshop_id;
              item.certification_status = mCert.certification_status;
            }
            return item;
          }

          // 2. Check as owner/seller
          const { data: ownerData, error: ownerErr } = await supabase
            .from('apartados')
            .select('*')
            .eq('moto_id', String(motoId))
            .order('created_at', { ascending: false })
            .limit(1);

          if (!ownerErr && Array.isArray(ownerData) && ownerData.length > 0) {
            const item = ownerData[0];
            const mCert = await getMotoCertificationAndAppointment(motoId);
            if (mCert?.isProgrammed || mCert?.isCertified) {
              item.certification_appointment_at = mCert.certification_appointment_at;
              item.certification_appointment_status = mCert.certification_appointment_status;
              item.certification_workshop = mCert.certification_workshop;
              item.certification_workshop_id = mCert.certification_workshop_id;
              item.certification_status = mCert.certification_status;
            }
            return item;
          }
        }
      } catch (err) {
        console.warn('Error querying apartado by moto:', err);
      }
    }
    return null;
  },

  getByMotoForBuyer: async (motoId) => {
    if (!motoId) return null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('apartados')
            .select('*')
            .eq('buyer_id', session.user.id)
            .eq('moto_id', String(motoId))
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const mCert = await getMotoCertificationAndAppointment(motoId);
            if (mCert?.isProgrammed || mCert?.isCertified) {
              item.certification_appointment_at = mCert.certification_appointment_at;
              item.certification_appointment_status = mCert.certification_appointment_status;
              item.certification_workshop = mCert.certification_workshop;
              item.certification_workshop_id = mCert.certification_workshop_id;
              item.certification_status = mCert.certification_status;
            }
            return item;
          }
        }
      } catch (err) {
        console.warn('Error querying apartado by moto:', err);
      }
    }
    return null;
  },

  received: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('apartados')
            .select('*, moto:motos(*)')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            const missingMotoIds = [...new Set(
              data.filter((a) => (!a.moto || (Array.isArray(a.moto) && a.moto.length === 0)) && a.moto_id)
                .map((a) => String(a.moto_id))
            )];
            const fetchedMotosMap = {};
            if (missingMotoIds.length > 0) {
              try {
                const { data: mData } = await supabase
                  .from('motos')
                  .select('*')
                  .in('id', missingMotoIds);
                if (Array.isArray(mData)) {
                  mData.forEach((m) => {
                    fetchedMotosMap[String(m.id)] = formatMotoRecord(m);
                  });
                }
              } catch (mErr) {
                console.warn('Error fetching missing motos for received apartados:', mErr);
              }
            }

            const normalizedData = data.map((a) => {
              const rawMoto = a.moto ? (Array.isArray(a.moto) ? a.moto[0] : a.moto) : null;
              const motoObj = rawMoto ? formatMotoRecord(rawMoto) : (fetchedMotosMap[String(a.moto_id)] || null);
              return {
                ...a,
                moto: motoObj || a.moto,
              };
            });

            const filtered = normalizedData.filter((a) => a.moto?.owner_id === session.user.id);
            const buyerIds = [...new Set(filtered.map((a) => a.buyer_id).filter(Boolean))];
            const profilesMap = {};
            if (buyerIds.length > 0) {
              try {
                const { data: profs } = await supabase
                  .from('profiles')
                  .select('id, name, full_name, email')
                  .in('id', buyerIds);
                if (Array.isArray(profs)) {
                  profs.forEach((p) => {
                    profilesMap[p.id] = p.full_name || p.name || (p.email ? p.email.split('@')[0] : null);
                  });
                }
              } catch (e) {
                console.warn('Error fetching buyer profiles:', e);
              }
            }

            // 1 NOD = 1 operación = 1 contrato
            // Query contracts and operation_tracking strictly by NOD (never by moto_id)
            const validReceivedNods = [...new Set(filtered.map((a) => a.nod).filter(Boolean))];
            const contractsMap = {};
            const trackingMap = {};
            if (validReceivedNods.length > 0) {
              try {
                const { data: cData } = await supabase
                  .from('contracts')
                  .select('*')
                  .in('nod', validReceivedNods);
                if (Array.isArray(cData)) {
                  cData.forEach((c) => {
                    if (c.nod) contractsMap[c.nod] = c;
                  });
                }
              } catch (cErr) {
                console.warn('Error querying contracts by NOD for received apartados:', cErr);
              }

              try {
                const { data: tData } = await supabase
                  .from('operation_tracking')
                  .select('*')
                  .in('nod', validReceivedNods);
                if (Array.isArray(tData)) {
                  tData.forEach((t) => {
                    if (t.nod) trackingMap[t.nod] = t;
                  });
                }
              } catch (tErr) {
                console.warn('Error querying operation_tracking by NOD for received apartados:', tErr);
              }
            }

            const mappedReceived = filtered.map((a) => {
              const motoObj = a.moto;
              const itemNod = a.nod || null;
              const contractObj = itemNod ? (contractsMap[itemNod] || a.contract || null) : (a.contract || null);
              const trackingObj = itemNod ? (trackingMap[itemNod] || a.tracking || a.operation_tracking || null) : (a.tracking || a.operation_tracking || null);

              return {
                ...a,
                nod: itemNod,
                apartado: a,
                contract: contractObj,
                tracking: trackingObj,
                contract_status: contractObj?.contract_status || a.contract_status || null,
                payment_status: trackingObj?.payment_status || a.payment_status || null,
                authorization_status: trackingObj?.authorization_status || trackingObj?.auth_status || a.authorization_status || null,
                transfer_status: trackingObj?.transfer_status || a.transfer_status || null,
                delivery_status: trackingObj?.delivery_status || a.delivery_status || null,
                moto_brand: a.moto_brand || motoObj?.brand,
                moto_model: a.moto_model || motoObj?.model,
                moto_year: a.moto_year || motoObj?.year,
                moto_price: a.moto_price || motoObj?.price,
                moto_city: a.moto_city || motoObj?.city,
                moto_image: motoObj?.images?.[0] || motoObj?.image || a.moto_image,
                seller_name: motoObj?.owner_name || session.user.user_metadata?.full_name || 'Vendedor',
                buyer_name: profilesMap[a.buyer_id] || a.buyer_name || 'Comprador Motoluv',
                certification_appointment_at: a.certification_appointment_at || null,
                certification_appointment_status: a.certification_appointment_status || 'Pendiente',
                certification_workshop: a.certification_workshop || null,
                certification_workshop_id: a.certification_workshop_id || null,
                certification_status: a.certification_status || 'PENDIENTE',
              };
            });

            // Asynchronously sync operational notifications for completed stages
            try {
              notificationApi.syncOperations(mappedReceived);
            } catch (syncErr) {
              console.warn('Error syncing operation notifications for received:', syncErr);
            }

            return mappedReceived;
          }
        }
      } catch (err) {
        console.warn('Error querying received apartados from Supabase:', err);
      }
    }

    try {
      const res = await api.get('/my/received-apartados');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  scheduleAppointment: async ({ apartado_id, appointment_at, workshop_name, workshop_id, moto_id }) => {
    if (!apartado_id && !moto_id) {
      throw new Error('ID de apartado o motocicleta requerido.');
    }

    let targetMotoId = moto_id ? String(moto_id) : null;

    // 1. Resolve moto_id if not directly provided
    if (!targetMotoId && apartado_id && isSupabaseConfigured && supabase) {
      try {
        const { data: ap } = await supabase
          .from('apartados')
          .select('id, moto_id, certification_appointment_status, certification_appointment_at, certification_workshop, certification_workshop_id, certification_status')
          .eq('id', apartado_id)
          .single();
        if (ap?.moto_id) {
          targetMotoId = String(ap.moto_id);
        }
      } catch (err) {
        console.warn('Could not query target apartado for moto_id:', err);
      }
    }

    // 2. Search by moto_id
    if (targetMotoId) {
      const existingInfo = await getMotoCertificationAndAppointment(targetMotoId);

      // Rule 3: If completed + approved or rejected certification exists, REUSE IT. NO crear otra.
      if (existingInfo?.isCertified || existingInfo?.isRejected) {
        const syncPayload = {
          certification_status: existingInfo.certification_status,
          certification_appointment_status: 'COMPLETADA',
          certification_appointment_at: existingInfo.certification_appointment_at || null,
          certification_workshop: existingInfo.certification_workshop || null,
          certification_workshop_id: existingInfo.certification_workshop_id || null,
        };

        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('apartados').update(syncPayload).eq('moto_id', targetMotoId);
          } catch (e) {
            console.warn('Error syncing completed cert to apartados:', e);
          }
        }

        return {
          reused: true,
          isCertified: existingInfo.isCertified,
          isRejected: existingInfo.isRejected,
          ...syncPayload,
          message: existingInfo.isCertified
            ? 'La motocicleta ya cuenta con certificación completada y aprobada.'
            : 'La motocicleta ya cuenta con certificación completada y rechazada.',
        };
      }

      // Rule 2: If appointment PROGRAMADA already exists, REUSE IT. NO crear otra.
      if (existingInfo?.isProgrammed && existingInfo.certification_appointment_at) {
        const syncPayload = {
          certification_appointment_at: existingInfo.certification_appointment_at,
          certification_appointment_status: 'PROGRAMADA',
          certification_workshop: existingInfo.certification_workshop || null,
          certification_workshop_id: existingInfo.certification_workshop_id || null,
          certification_status: existingInfo.certification_status || 'PENDIENTE',
        };

        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('apartados').update(syncPayload).eq('moto_id', targetMotoId);
          } catch (e) {
            console.warn('Error syncing programmed appt to apartados:', e);
          }
        }

        return {
          reused: true,
          isProgrammed: true,
          ...syncPayload,
          message: 'Cita programada existente reutilizada.',
        };
      }
    }

    // Rule 4: Only allow new appointment if none valid or previous was CANCELADA/NO_PRESENTADO
    if (!appointment_at) {
      throw new Error('ID de apartado y fecha son obligatorios para agendar la cita.');
    }

    const appointmentIso = new Date(appointment_at).toISOString();
    const updatePayload = {
      certification_appointment_at: appointmentIso,
      certification_appointment_status: 'PROGRAMADA',
      certification_workshop: workshop_name || null,
      certification_workshop_id: workshop_id || null,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        let resultData = null;

        if (targetMotoId) {
          // Update ALL apartados for this moto_id so buyer and seller always have the exact same appointment
          await supabase
            .from('apartados')
            .update(updatePayload)
            .eq('moto_id', targetMotoId);

          try {
            await supabase
              .from('motos')
              .update({
                certification_appointment_at: appointmentIso,
                certification_appointment_status: 'PROGRAMADA',
                certification_workshop: workshop_name || null,
                certification_workshop_id: workshop_id || null,
              })
              .eq('id', targetMotoId);
          } catch {
            // ignore if motos columns differ
          }
        }

        if (apartado_id) {
          const { data, error } = await supabase
            .from('apartados')
            .update(updatePayload)
            .eq('id', apartado_id)
            .select('*, moto:motos(*)')
            .single();

          if (error) {
            console.error('Error updating appointment in Supabase:', error);
            throw error;
          }
          resultData = data;
        }

        // Auto mark related notification as attended/read
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id && apartado_id) {
            await supabase
              .from('notifications')
              .update({ read_at: new Date().toISOString() })
              .eq('recipient_id', session.user.id)
              .eq('apartado_id', String(apartado_id));
          }
        } catch {
          // ignore notification mark error
        }

        return resultData || updatePayload;
      } catch (err) {
        console.warn('Supabase schedule appointment error:', err);
        throw err;
      }
    }

    return api
      .put(`/apartados/${apartado_id || 'by-moto'}/appointment`, {
        appointment_at: appointmentIso,
        workshop_name,
        workshop_id,
        moto_id: targetMotoId,
        status: 'PROGRAMADA',
      })
      .then((r) => r.data);
  },
};

export const certificationApi = {
  getByNodOrMoto: async ({ nod, motoId }) => {
    if (!nod && !motoId) return null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return null;

        const cleanNod = nod ? String(nod).trim() : null;
        const cleanMotoId = motoId ? String(motoId).trim() : null;

        // 1. Regla NOD: Cuando exista NOD, la certificación DEBE resolverse por:
        //    NOD + moto_id y, cuando sea necesario, por NOD.
        //    NO utilizar moto_id como fallback cuando ya existe un NOD disponible
        //    para evitar mezclar certificaciones de diferentes operaciones.
        if (cleanNod) {
          if (cleanMotoId) {
            const { data, error } = await supabase
              .from('moto_certifications')
              .select('*')
              .eq('nod', cleanNod)
              .eq('moto_id', cleanMotoId)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && Array.isArray(data) && data.length > 0) {
              return data[0];
            }
          }

          const { data, error } = await supabase
            .from('moto_certifications')
            .select('*')
            .eq('nod', cleanNod)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            return data[0];
          }

          // Si existe NOD y no hay registro en moto_certifications para ese NOD,
          // NUNCA hacer fallback a moto_id para no traer certificados de otra operación.
          return null;
        }

        // 2. Solo si NO existe NOD, buscar por moto_id
        if (cleanMotoId) {
          const { data, error } = await supabase
            .from('moto_certifications')
            .select('*')
            .eq('moto_id', cleanMotoId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            return data[0];
          }
        }
      } catch (err) {
        console.warn('Error querying moto_certifications in Supabase:', err);
      }
    }
    return null;
  },
};

export const offerApi = {
  create: async (data) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('Usuario no autenticado');

        const offerRecord = {
          moto_id: String(data.moto_id),
          buyer_id: session.user.id,
          amount: Number(data.amount) || 0,
          status: 'ENVIADA',
          ...(data.package ? { package: data.package } : { package: null }),
        };

        const { data: inserted, error } = await supabase
          .from('offers')
          .insert([offerRecord])
          .select('*')
          .single();

        if (error) {
          console.error('Supabase offer insert error:', error);
          const errMsg = (error.message || '').toLowerCase();
          if (
            errMsg.includes('monto') ||
            errMsg.includes('amount') ||
            errMsg.includes('constraint') ||
            errMsg.includes('check') ||
            errMsg.includes('invalid') ||
            error.code === '23514'
          ) {
            throw new Error('El monto ingresado no puede procesarse. Revisa tu oferta e inténtalo nuevamente.');
          }
          throw error;
        }

        if (inserted) {
          return inserted;
        }
      } catch (err) {
        const errMsg = (err?.message || '').toLowerCase();
        if (
          errMsg.includes('monto') ||
          errMsg.includes('amount') ||
          errMsg.includes('constraint') ||
          errMsg.includes('check') ||
          errMsg.includes('invalid') ||
          err?.code === '23514'
        ) {
          throw new Error('El monto ingresado no puede procesarse. Revisa tu oferta e inténtalo nuevamente.');
        }
        throw err;
      }
    }
    const payload = {
      moto_id: data.moto_id,
      amount: Number(data.amount) || 0,
      ...(data.package ? { package: data.package } : { package: null }),
    };
    return api.post('/offers', payload).then((r) => r.data);
  },

  mine: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('offers')
            .select('*, moto:motos(*)')
            .eq('buyer_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            return data.map((o) => ({
              ...o,
              status: o.status || 'ENVIADA',
              moto_brand: o.moto?.brand,
              moto_model: o.moto?.model,
              moto_year: o.moto?.year,
              moto_image: o.moto?.images?.[0] || o.moto?.image,
              seller_name: o.moto?.owner_name || 'Vendedor Verificado',
            }));
          }
        }
      } catch (err) {
        console.warn('Error querying user offers from Supabase:', err);
      }
    }

    try {
      const res = await api.get('/my/offers');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  received: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('offers')
            .select('*, moto:motos(*)')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            return data
              .filter((o) => o.moto?.owner_id === session.user.id || o.seller_id === session.user.id)
              .map((o) => ({
                ...o,
                status: o.status || 'ENVIADA',
                motoBrand: o.moto?.brand,
                motoModel: o.moto?.model,
                originalPrice: o.moto?.price,
                offeredAmount: o.amount,
                buyerName: o.buyer_name || 'Comprador',
              }));
          }
        }
      } catch (err) {
        console.warn('Error querying received offers from Supabase:', err);
      }
    }

    try {
      const res = await api.get('/my/received-offers');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  respond: async (id, status, rejectionReason = null, rejectionConfirmed = false) => {
    // Map to strictly allowed states: ENVIADA, PENDIENTE, ACEPTADA, RECHAZADA, EXPIRADA
    let finalStatus = status;
    if (status === 'accepted' || status === 'Aceptada') finalStatus = 'ACEPTADA';
    else if (status === 'rejected' || status === 'Rechazada') finalStatus = 'RECHAZADA';
    else if (status === 'pending' || status === 'Pendiente') finalStatus = 'PENDIENTE';
    else if (status === 'expired' || status === 'Expirada') finalStatus = 'EXPIRADA';

    const updatePayload = {
      status: finalStatus,
    };

    if (finalStatus === 'RECHAZADA') {
      if (rejectionReason) {
        updatePayload.message = String(rejectionReason).trim();
      }
      if (rejectionConfirmed === true) {
        updatePayload.rejection_confirmed = true;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('offers')
        .update(updatePayload)
        .eq('id', String(id))
        .select('*')
        .single();

      if (error) {
        console.error('Error updating offer in Supabase:', error);
        throw error;
      }

      if (data) {
        return data;
      }
    }
    return api.patch(`/offers/${id}`, updatePayload).then((r) => r.data);
  },

  updateStatus: async (id, status, rejectionReason = null, rejectionConfirmed = false) => {
    let finalStatus = status;
    if (status === 'accepted' || status === 'Aceptada') finalStatus = 'ACEPTADA';
    else if (status === 'rejected' || status === 'Rechazada') finalStatus = 'RECHAZADA';
    else if (status === 'pending' || status === 'Pendiente') finalStatus = 'PENDIENTE';
    else if (status === 'expired' || status === 'Expirada') finalStatus = 'EXPIRADA';

    const updatePayload = {
      status: finalStatus,
    };

    if (finalStatus === 'RECHAZADA') {
      if (rejectionReason) {
        updatePayload.message = String(rejectionReason).trim();
      }
      if (rejectionConfirmed === true) {
        updatePayload.rejection_confirmed = true;
      }
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('offers')
        .update(updatePayload)
        .eq('id', String(id))
        .select('*')
        .single();

      if (error) {
        console.error('Error updating offer in Supabase:', error);
        throw error;
      }

      if (data) {
        return data;
      }
    }
    return api.patch(`/offers/${id}`, updatePayload).then((r) => r.data);
  },
};

export const uploadApi = {
  image: async (file) => {
    // 1. Direct upload to Supabase Storage if configured on client
    if (isSupabaseConfigured && supabase) {
      const candidateBuckets = ['motos', 'Motos', 'images', 'uploads', 'vehicles', 'public', 'motoluv'];
      const fileExt = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg';
      const cleanFileName = `moto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      for (const bucket of candidateBuckets) {
        try {
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(cleanFileName, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/jpeg',
            });

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(cleanFileName);

            if (publicUrlData && publicUrlData.publicUrl) {
              return {
                url: publicUrlData.publicUrl,
                filename: cleanFileName,
                provider: 'supabase',
                bucket,
              };
            }
          }
        } catch {
          // try next bucket
        }
      }
    }

    // 2. Fallback to backend /api/upload endpoint
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.data?.url) {
        return res.data;
      }
    } catch (backendErr) {
      console.warn('Backend upload fallback failed, using local preview:', backendErr);
    }

    // 3. Fallback to client-side Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result,
          filename: file.name || `photo_${Date.now()}.jpg`,
          provider: 'client_base64',
        });
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },
};

export const partnerApi = {
  apply: (data) => api.post('/partners', data).then((r) => r.data),
};

// 5 Operation Notifications Definitions
export const OPERATION_NOTIFICATION_DEFINITIONS = {
  CONTRATO_FIRMADO: {
    type: 'CONTRATO_FIRMADO',
    title: 'Tu contrato está firmado',
    body: 'Tu contrato ha sido firmado correctamente.',
  },
  PAGO_CONFIRMADO: {
    type: 'PAGO_CONFIRMADO',
    title: 'Pago confirmado',
    body: 'Tu pago fue confirmado. El dinero está en custodia.',
  },
  OPERACION_AUTORIZADA: {
    type: 'OPERACION_AUTORIZADA',
    title: 'Operación autorizada',
    body: 'Tu operación ha sido autorizada correctamente.',
  },
  TRANSFERENCIA_COMPLETADA: {
    type: 'TRANSFERENCIA_COMPLETADA',
    title: 'Transferencia completada',
    body: 'La transferencia de tu motocicleta se completó correctamente.',
  },
  ENTREGA_COMPLETADA: {
    type: 'ENTREGA_COMPLETADA',
    title: '¡Tu motocicleta está contigo!',
    body: 'La entrega se completó correctamente. ¡Felicidades por tu nueva motocicleta!',
  },
};

// Memory cache to prevent duplicate notification triggers within the session
const inMemoryNotifiedKeys = new Set();
const nidToUuidProfileCache = new Map();

async function resolveBuyerUuid(rawBuyerId, apartadoId, nod) {
  if (!rawBuyerId && !apartadoId && !nod) return null;

  // 1. If rawBuyerId is already a valid UUID
  if (typeof rawBuyerId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawBuyerId.trim())) {
    return rawBuyerId.trim();
  }

  // 2. If rawBuyerId is an NID like MTL-000031
  if (typeof rawBuyerId === 'string' && rawBuyerId.startsWith('MTL-')) {
    if (nidToUuidProfileCache.has(rawBuyerId)) {
      return nidToUuidProfileCache.get(rawBuyerId);
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('nid', rawBuyerId)
          .single();
        if (prof?.id) {
          nidToUuidProfileCache.set(rawBuyerId, prof.id);
          return prof.id;
        }
      } catch (err) {
        // continue
      }
    }
  }

  // 3. Fallback: look up in apartados table by apartadoId or nod
  if (isSupabaseConfigured && supabase && (apartadoId || nod)) {
    try {
      let query = supabase.from('apartados').select('buyer_id');
      if (apartadoId) {
        query = query.eq('id', apartadoId);
      } else if (nod) {
        query = query.eq('nod', nod);
      }
      const { data: apt } = await query.single();
      if (apt?.buyer_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apt.buyer_id)) {
        if (rawBuyerId) nidToUuidProfileCache.set(rawBuyerId, apt.buyer_id);
        return apt.buyer_id;
      }
    } catch (err) {
      // ignore
    }
  }

  // 4. Fallback: authenticated user session if current user is buyer
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        if (!rawBuyerId || session.user.id === rawBuyerId) {
          return session.user.id;
        }
      }
    } catch (err) {
      // ignore
    }
  }

  return null;
}

export const notificationApi = {
  getUnread: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        if (currentUserId) {
          const { data, error } = await supabase
            .from('notifications')
            .select('id, recipient_id, type, title, body, moto_id, apartado_id, offer_id, created_at, read_at')
            .eq('recipient_id', currentUserId)
            .is('read_at', null)
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            return data.map((n) => ({
              id: String(n.id),
              recipient_id: String(n.recipient_id),
              type: n.type,
              title: n.title || 'Notificación',
              body: n.body || '',
              moto_id: n.moto_id,
              apartado_id: n.apartado_id,
              offer_id: n.offer_id,
              created_at: n.created_at,
              read_at: n.read_at,
            }));
          }
        }
      } catch (err) {
        console.warn('Error querying notifications from Supabase:', err);
      }
    }
    return [];
  },

  markAsRead: async (notificationId) => {
    if (!notificationId) return false;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        if (currentUserId) {
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('notifications')
            .update({ read_at: now })
            .eq('id', notificationId)
            .eq('recipient_id', currentUserId);

          if (!error) {
            return true;
          }
        }
      } catch (err) {
        console.warn('Error marking notification as read in Supabase:', err);
      }
    }
    return false;
  },

  markAllAsRead: async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        if (currentUserId) {
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('notifications')
            .update({ read_at: now })
            .eq('recipient_id', currentUserId)
            .is('read_at', null);

          if (!error) {
            return true;
          }
        }
      } catch (err) {
        console.warn('Error marking all notifications as read in Supabase:', err);
      }
    }
    return false;
  },

  /**
   * Sends one of the 5 operation notifications if not already sent.
   * Strictly prevents duplicate notifications for the same operation event.
   */
  sendOperationNotification: async ({ type, recipientId, motoId, apartadoId, nod }) => {
    if (!recipientId || !type || !OPERATION_NOTIFICATION_DEFINITIONS[type]) return null;

    // In-memory deduplication check
    const dedupKey = `${recipientId}:${type}:${apartadoId || motoId || nod || 'default'}`;
    if (inMemoryNotifiedKeys.has(dedupKey)) {
      return null;
    }

    const notifDef = OPERATION_NOTIFICATION_DEFINITIONS[type];

    // Check if notification already exists in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', recipientId)
          .eq('type', type);

        if (apartadoId) {
          query = query.eq('apartado_id', String(apartadoId));
        } else if (motoId) {
          query = query.eq('moto_id', String(motoId));
        }

        const { data: existing, error: qErr } = await query.limit(1);
        if (!qErr && Array.isArray(existing) && existing.length > 0) {
          inMemoryNotifiedKeys.add(dedupKey);
          return null;
        }
      } catch (checkErr) {
        console.warn('Error checking existing notification in Supabase:', checkErr);
      }
    }

    // Mark as handled in-memory
    inMemoryNotifiedKeys.add(dedupKey);

    const payload = {
      recipient_id: recipientId,
      type: notifDef.type,
      title: notifDef.title,
      body: notifDef.body,
      moto_id: motoId ? String(motoId) : null,
      apartado_id: apartadoId ? String(apartadoId) : null,
    };

    let inserted = null;

    // Direct Supabase insert into public.notifications
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert([payload])
          .select('*')
          .single();

        if (!error && data) {
          inserted = data;
        } else if (error) {
          console.warn('Error inserting notification into Supabase:', error);
        }
      } catch (err) {
        console.warn('Exception inserting notification into Supabase:', err);
      }
    }

    return inserted;
  },

  /**
   * Evaluates operations and automatically emits the 5 operation notifications
   * for any stages that have been completed, with zero duplicates.
   */
  syncOperations: async (operations) => {
    if (!operations) return;
    const opsList = Array.isArray(operations) ? operations : [operations];
    if (opsList.length === 0) return;

    for (const op of opsList) {
      try {
        const item = op.raw || op.item || op;
        const nod = op.nod || item.nod || item.apartado?.nod || item.contract?.nod || item.tracking?.nod || null;
        const apartadoId = op.apartadoId || item.id || item.apartado_id || item.apartado?.id || null;
        const motoId = op.motoId || item.moto_id || item.moto?.id || null;

        const rawBuyerId = op.buyerId || item.buyer_id || item.apartado?.buyer_id || item.contract?.buyer_id || item.tracking?.buyer_id || null;
        const buyerUuid = await resolveBuyerUuid(rawBuyerId, apartadoId, nod);
        if (!buyerUuid) continue;

        const contract = item.contract || null;
        const tracking = item.tracking || item.operation_tracking || null;

        const rawContractStatus = String(
          contract?.contract_status || item.contract_status || ''
        ).toUpperCase().trim();

        const isContractCompleted =
          op.isContractCompleted !== undefined
            ? Boolean(op.isContractCompleted)
            : (rawContractStatus === 'FIRMADO' || rawContractStatus === 'COMPLETADO' || rawContractStatus === 'SIGNED');

        if (isContractCompleted) {
          // 1. CONTRATO_FIRMADO
          await notificationApi.sendOperationNotification({
            type: 'CONTRATO_FIRMADO',
            recipientId: buyerUuid,
            motoId,
            apartadoId,
            nod,
          });

          // Once contract is signed, stages 3-6 depend on operation_tracking
          const rawPaymentStatus = String(
            tracking?.payment_status || item.payment_status || ''
          ).toUpperCase().trim();

          const isPagoCompleted =
            op.isPagoCompleted !== undefined
              ? Boolean(op.isPagoCompleted)
              : (rawPaymentStatus === 'COMPLETADO' ||
                 rawPaymentStatus === 'COMPLETADA' ||
                 rawPaymentStatus === 'PAGADO' ||
                 rawPaymentStatus === 'PAGADA' ||
                 rawPaymentStatus === 'EN_CUSTODIA');

          if (isPagoCompleted) {
            // 2. PAGO_CONFIRMADO
            await notificationApi.sendOperationNotification({
              type: 'PAGO_CONFIRMADO',
              recipientId: buyerUuid,
              motoId,
              apartadoId,
              nod,
            });
          }

          const rawAuthStatus = String(
            tracking?.authorization_status || tracking?.auth_status || item.authorization_status || item.auth_status || ''
          ).toUpperCase().trim();

          const isAuthCompleted =
            op.isAuthCompleted !== undefined
              ? Boolean(op.isAuthCompleted)
              : (rawAuthStatus === 'COMPLETADO' ||
                 rawAuthStatus === 'COMPLETADA' ||
                 rawAuthStatus === 'AUTORIZADO' ||
                 rawAuthStatus === 'AUTORIZADA' ||
                 rawAuthStatus === 'APROBADO' ||
                 rawAuthStatus === 'APROBADA' ||
                 rawAuthStatus === 'APPROVED');

          if (isAuthCompleted) {
            // 3. OPERACION_AUTORIZADA
            await notificationApi.sendOperationNotification({
              type: 'OPERACION_AUTORIZADA',
              recipientId: buyerUuid,
              motoId,
              apartadoId,
              nod,
            });
          }

          const rawTransferStatus = String(
            tracking?.transfer_status || item.transfer_status || ''
          ).toUpperCase().trim();

          const isTransferCompleted =
            op.isTransferCompleted !== undefined
              ? Boolean(op.isTransferCompleted)
              : (rawTransferStatus === 'COMPLETADO' ||
                 rawTransferStatus === 'COMPLETADA' ||
                 rawTransferStatus === 'TRANSFERIDO' ||
                 rawTransferStatus === 'TRANSFERIDA');

          if (isTransferCompleted) {
            // 4. TRANSFERENCIA_COMPLETADA
            await notificationApi.sendOperationNotification({
              type: 'TRANSFERENCIA_COMPLETADA',
              recipientId: buyerUuid,
              motoId,
              apartadoId,
              nod,
            });
          }

          const rawDeliveryStatus = String(
            tracking?.delivery_status || item.delivery_status || ''
          ).toUpperCase().trim();

          const isDeliveryCompleted =
            op.isDeliveryCompleted !== undefined
              ? Boolean(op.isDeliveryCompleted)
              : (rawDeliveryStatus === 'COMPLETADO' ||
                 rawDeliveryStatus === 'COMPLETADA' ||
                 rawDeliveryStatus === 'ENTREGADO' ||
                 rawDeliveryStatus === 'ENTREGADA' ||
                 rawDeliveryStatus === 'DELIVERED');

          if (isDeliveryCompleted) {
            // 5. ENTREGA_COMPLETADA
            await notificationApi.sendOperationNotification({
              type: 'ENTREGA_COMPLETADA',
              recipientId: buyerUuid,
              motoId,
              apartadoId,
              nod,
            });
          }
        }
      } catch (itemErr) {
        console.warn('Error evaluating operation for notifications:', itemErr);
      }
    }
  },
};

export const chatApi = {
  send: (message, history = []) => api.post('/chat', { message, history }).then((r) => r.data),
};

export const stripeApi = {
  getConfig: () => api.get('/stripe/config').then((r) => r.data),
  createPaymentIntent: (data) => api.post('/stripe/create-payment-intent', data).then((r) => r.data),
  createCheckoutSession: (data) => api.post('/stripe/create-checkout-session', data).then((r) => r.data),
  processOrder: (data) => api.post('/stripe/process-order', data).then((r) => r.data),
};

export const clipApi = {
  getConfig: () => api.get('/clip/config').then((r) => r.data),
  createPaymentRequest: (data) => api.post('/clip/create-payment-request', data).then((r) => r.data),
  processCheckout: (data) => api.post('/clip/process-checkout', data).then((r) => r.data),
};

export const hubspotApi = {
  syncUserRegistration: (userData) => api.post('/webhooks/hubspot/user-register', userData).then((r) => r.data),
  syncStatusCard: (cardData) => api.post('/webhooks/hubspot/status-card', cardData).then((r) => r.data),
};

export default api;
