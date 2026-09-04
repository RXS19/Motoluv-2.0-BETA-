-- =========================================================================
-- MOTOLUV - INCREMENTO ATÓMICO DE VISTAS (RPC)
-- =========================================================================
-- Cada click hacia el detalle de una publicación suma exactamente +2 vistas.
-- views = COALESCE(views, 0) + 2 de forma atómica en public.motos.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.increment_moto_views(p_moto_id text, p_step int DEFAULT 2)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_views int;
BEGIN
  UPDATE public.motos
  SET views = COALESCE(views, 0) + COALESCE(p_step, 2)
  WHERE id = p_moto_id
  RETURNING views INTO v_new_views;

  RETURN COALESCE(v_new_views, 0);
END;
$$;

-- Otorgar permisos de ejecución para roles públicos y autenticados
GRANT EXECUTE ON FUNCTION public.increment_moto_views(text, int) TO anon, authenticated, service_role;
