-- =========================================================================
-- MOTOLUV - DIAGNÓSTICO: ELIMINAR TEMPORALMENTE EL TRIGGER ON auth.users
-- =========================================================================
-- Esta migración elimina el trigger sobre auth.users para comprobar si
-- supabase.auth.signUp() puede crear el usuario en auth.users de forma aislada.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
