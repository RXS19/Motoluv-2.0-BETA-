-- =========================================================================
-- MOTOLUV - ARQUITECTURA DE CICLO DE USUARIOS DEFINITIVA
-- =========================================================================
-- 1. auth.users (Fuente oficial de autenticación)
-- 2. public.register_users (Registro histórico e inmutable del primer registro)
-- 3. public.users (Registro actual y actualizable)
-- 4. public.profiles (Perfil de usuario para el Dashboard)
-- 5. public.sync_current_user() (Función RPC de sincronización segura)
-- =========================================================================

-- Desactivar y remover triggers automáticos sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 1. TABLA INMUTABLE: register_users (Histórico de primer registro)
CREATE TABLE IF NOT EXISTS public.register_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  city TEXT DEFAULT 'Ciudad de México',
  role TEXT DEFAULT 'both',
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA PRINCIPAL DE USUARIOS: users (Datos vigentes y actualizables)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  phone_updated_once BOOLEAN DEFAULT false,
  phone_change_count INTEGER DEFAULT 0,
  city TEXT DEFAULT 'Ciudad de México',
  role TEXT DEFAULT 'both',
  bank_clabe TEXT,
  bank_name TEXT,
  bank_holder TEXT,
  bank_updated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PERFILES PARA DASHBOARD: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  phone_updated_once BOOLEAN DEFAULT false,
  phone_change_count INTEGER DEFAULT 0,
  city TEXT DEFAULT 'Ciudad de México',
  role TEXT DEFAULT 'both',
  bank_clabe TEXT,
  bank_name TEXT,
  bank_holder TEXT,
  bank_updated_at TIMESTAMPTZ,
  rating NUMERIC(3,2) DEFAULT 5.0,
  operations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FUNCIÓN RPC: sync_current_user()
-- Sincroniza al usuario autenticado actual en register_users, users y profiles
CREATE OR REPLACE FUNCTION public.sync_current_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_user_id UUID;
  v_full_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_role TEXT;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No authenticated user session');
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth.users');
  END IF;

  v_email := v_user.email;

  v_full_name := COALESCE(
    v_user.raw_user_meta_data->>'full_name',
    v_user.raw_user_meta_data->>'name',
    NULLIF(split_part(COALESCE(v_email, ''), '@', 1), ''),
    'Usuario Motoluv'
  );

  v_phone := COALESCE(
    v_user.raw_user_meta_data->>'phone',
    v_user.raw_user_meta_data->>'phone_number',
    v_user.raw_user_meta_data->>'phoneNumber',
    v_user.phone,
    ''
  );

  v_city := COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'city', ''),
    'Ciudad de México'
  );

  v_role := COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'role', ''),
    'both'
  );

  -- A. Insertar en register_users solo la primera vez (INMUTABLE: ON CONFLICT DO NOTHING)
  INSERT INTO public.register_users (
    id,
    email,
    full_name,
    phone,
    city,
    role,
    registered_at
  )
  VALUES (
    v_user_id,
    v_email,
    v_full_name,
    v_phone,
    v_city,
    v_role,
    COALESCE(v_user.created_at, NOW())
  )
  ON CONFLICT (id) DO NOTHING;

  -- B. Sincronizar en public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    city,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_email,
    v_full_name,
    v_phone,
    v_city,
    v_role,
    COALESCE(v_user.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.users.full_name IS NULL OR public.users.full_name = '' OR public.users.full_name = 'Usuario Motoluv' 
      THEN EXCLUDED.full_name 
      ELSE public.users.full_name 
    END,
    phone = CASE 
      WHEN (public.users.phone IS NULL OR public.users.phone = '') AND EXCLUDED.phone <> '' 
      THEN EXCLUDED.phone 
      ELSE public.users.phone 
    END,
    city = COALESCE(NULLIF(public.users.city, ''), EXCLUDED.city),
    role = COALESCE(NULLIF(public.users.role, ''), EXCLUDED.role),
    updated_at = NOW();

  -- C. Sincronizar en public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    city,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_full_name,
    v_phone,
    v_city,
    v_role,
    COALESCE(v_user.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' OR public.profiles.full_name = 'Usuario Motoluv' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END,
    phone = CASE 
      WHEN (public.profiles.phone IS NULL OR public.profiles.phone = '') AND EXCLUDED.phone <> '' 
      THEN EXCLUDED.phone 
      ELSE public.profiles.phone 
    END,
    city = COALESCE(NULLIF(public.profiles.city, ''), EXCLUDED.city),
    role = COALESCE(NULLIF(public.profiles.role, ''), EXCLUDED.role),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.register_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para register_users (Inmutable: Solo lectura de registro propio, nunca UPDATE/DELETE desde cliente)
DROP POLICY IF EXISTS "Users can read own registration" ON public.register_users;
CREATE POLICY "Users can read own registration"
  ON public.register_users FOR SELECT
  USING (auth.uid() = id);

-- Políticas para users
DROP POLICY IF EXISTS "Users can read own users record" ON public.users;
CREATE POLICY "Users can read own users record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own users record" ON public.users;
CREATE POLICY "Users can insert own users record"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own users record" ON public.users;
CREATE POLICY "Users can update own users record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
