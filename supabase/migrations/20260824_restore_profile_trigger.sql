-- =========================================================================
-- MOTOLUV - MIGRACIÓN: RESTAURACIÓN DEFINITIVA DEL TRIGGER DE PERFILES
-- =========================================================================
-- Esta migración asegura que cada registro en auth.users (vía Email/Password o Google OAuth)
-- cree o actualice de forma atómica e idempotente su registro en public.profiles.

-- 1. Asegurar tabla public.profiles con todos los campos requeridos
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  city TEXT DEFAULT 'Ciudad de México',
  role TEXT DEFAULT 'both', -- 'comprador', 'vendedor', 'both'
  bank_clabe TEXT,
  bank_name TEXT,
  bank_holder TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  operations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Función del Trigger (SECURITY DEFINER + search_path público + Idempotencia)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_role TEXT;
BEGIN
  -- Extraer datos desde raw_user_meta_data con múltiples fallbacks limpios
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuario Motoluv'
  );

  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'phoneNumber',
    NEW.phone,
    ''
  );

  v_city := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    'Ciudad de México'
  );

  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    'both'
  );

  -- Inserción / Actualización idempotente utilizando ON CONFLICT (id) DO UPDATE
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
    NEW.id,
    v_full_name,
    v_phone,
    v_city,
    v_role,
    NOW(),
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Evitar que una falla accesoria impida la creación del usuario en auth.users
  RAISE WARNING 'Error en handle_new_user para usuario %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Crear / Reactivar el Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Habilitar RLS y políticas seguras para que los usuarios gestionen su propio perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
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
