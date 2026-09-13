-- =========================================================================
-- MOTOLUV - MIGRACIÓN: NOTIFICACIÓN AUTOMÁTICA EN POSTGRESQL AL PUBLICAR MOTO
-- =========================================================================
-- Al cambiar public.motos.status de 'EN_REVISION' a 'PUBLICADA':
-- 1. Crea automáticamente una notificación únicamente para el vendedor dueño
--    (recipient_id = NEW.owner_id).
-- 2. Evita duplicados: no inserta si ya existe una notificación de tipo
--    'MOTO_PUBLICADA' para el mismo moto_id y el mismo recipient_id.
-- 3. Se ejecuta de manera nativa e idempotente a nivel PostgreSQL vía Trigger.
-- =========================================================================

-- 1. Función trigger para notificar la aprobación y publicación de una moto
CREATE OR REPLACE FUNCTION public.notify_moto_published_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moto_title TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Validar transición de estatus: de EN_REVISION a PUBLICADA (insensible a mayúsculas/minúsculas)
  IF (UPPER(COALESCE(OLD.status, '')) = 'EN_REVISION') AND (UPPER(COALESCE(NEW.status, '')) = 'PUBLICADA') THEN
    
    -- Validar que exista el id de la moto y el dueño vendedor
    IF NEW.id IS NOT NULL AND NEW.owner_id IS NOT NULL THEN
      
      -- Prevención estricta de duplicados a nivel de base de datos
      SELECT EXISTS (
        SELECT 1 
        FROM public.notifications
        WHERE recipient_id = NEW.owner_id
          AND moto_id = NEW.id
          AND type = 'MOTO_PUBLICADA'
      ) INTO v_exists;

      IF NOT v_exists THEN
        v_moto_title := TRIM(COALESCE(NEW.brand, '') || ' ' || COALESCE(NEW.model, ''));
        IF v_moto_title = '' THEN
          v_moto_title := 'tu motocicleta';
        END IF;

        INSERT INTO public.notifications (
          recipient_id,
          type,
          title,
          body,
          moto_id,
          apartado_id,
          offer_id,
          created_at,
          read_at
        ) VALUES (
          NEW.owner_id,
          'MOTO_PUBLICADA',
          '¡Publicación aprobada!',
          'Tu motocicleta ' || v_moto_title || ' ha sido revisada y ya se encuentra publicada en el catálogo oficial.',
          NEW.id,
          NULL,
          NULL,
          NOW(),
          NULL
        );
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Asegurar permisos de ejecución de la función
GRANT EXECUTE ON FUNCTION public.notify_moto_published_on_status_change() TO anon, authenticated, service_role;

-- 3. Crear el Trigger sobre public.motos para updates en el campo status
DROP TRIGGER IF EXISTS trg_notify_moto_published ON public.motos;

CREATE TRIGGER trg_notify_moto_published
  AFTER UPDATE OF status ON public.motos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_moto_published_on_status_change();
