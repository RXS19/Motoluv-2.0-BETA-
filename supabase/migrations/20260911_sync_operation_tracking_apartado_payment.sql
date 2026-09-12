-- =========================================================================
-- MOTOLUV - MIGRACIÓN: SINCRONIZACIÓN DE PAGO DE APARTADO CON OPERATION_TRACKING
-- =========================================================================
-- Asegura que el trigger trg_sync_operation_tracking_apartado_payment
-- se ejecute tanto en INSERT como en UPDATE OF paid_at sobre public.apartados,
-- sincronizando paid_at hacia operation_tracking.apartado_payment_completed_at.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_operation_tracking_apartado_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.paid_at IS NOT NULL THEN
    UPDATE public.operation_tracking
    SET 
      apartado_payment_completed_at = NEW.paid_at,
      updated_at = NOW()
    WHERE (apartado_id IS NOT NULL AND apartado_id = NEW.id)
       OR (NEW.nod IS NOT NULL AND nod = NEW.nod);
  END IF;
  RETURN NEW;
END;
$$;

-- Eliminar versión previa y recrear con soporte para INSERT y UPDATE OF paid_at
DROP TRIGGER IF EXISTS trg_sync_operation_tracking_apartado_payment ON public.apartados;

CREATE TRIGGER trg_sync_operation_tracking_apartado_payment
  AFTER INSERT OR UPDATE OF paid_at ON public.apartados
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_operation_tracking_apartado_payment();
