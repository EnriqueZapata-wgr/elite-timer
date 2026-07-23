-- ============================================================================
-- 213 — Delta economía meditación/respiración (decisión Enrique 2026-07-23).
--
-- Las prácticas (source 'meditation' | 'breathwork') dejan la regla once/día
-- y pasan a: máximo 3 e- por día local por source, y cada award ≥3h después
-- del anterior del MISMO source. Se enforcea AQUÍ (server-side, trigger sobre
-- el insert en electron_logs) porque la RLS de la tabla permite INSERT
-- directo del cliente — el candado es implícito en los datos, sin timers.
--
-- Decisiones:
--   · El espaciado se evalúa DENTRO del mismo día local (NEW.date, que el
--     cliente escribe con getLocalToday). Así el 1er award de un día nuevo
--     jamás se bloquea → la card de HOY / racha / atribución ARGOS se marca
--     siempre que hubo práctica genuina, aunque la última fuera anoche.
--   · Cap y espaciado son POR SOURCE (meditation y breathwork independientes,
--     3+3).
--   · Rechazo → excepción con token ATP_PRACTICE_CAP / ATP_PRACTICE_SPACING
--     en el mensaje: el cliente (practice-electron-core.ts) lo clasifica y
--     falla-suave. Nada de este trigger toca los demás sources.
--   · pg_advisory_xact_lock serializa dos inserts en carrera del mismo
--     user+source (sin él, ambos verían count=2 y entrarían 4 filas).
--
-- Idempotente: CREATE OR REPLACE + DROP TRIGGER IF EXISTS + IF NOT EXISTS.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_electron_logs_user_source_date
  ON electron_logs(user_id, source, date);

CREATE OR REPLACE FUNCTION public.enforce_practice_electron_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_last  timestamptz;
BEGIN
  IF NEW.source NOT IN ('meditation', 'breathwork')
     OR NEW.category IS DISTINCT FROM 'boolean_daily' THEN
    RETURN NEW;
  END IF;

  -- Serializar awards concurrentes del mismo user+source.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text || ':' || NEW.source));

  SELECT count(*), max(created_at)
    INTO v_count, v_last
    FROM public.electron_logs
   WHERE user_id = NEW.user_id
     AND source = NEW.source
     AND date = NEW.date
     AND category = 'boolean_daily';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'ATP_PRACTICE_CAP: máximo 3 electrones de % por día', NEW.source
      USING ERRCODE = 'P0001';
  END IF;

  IF v_last IS NOT NULL AND v_last > now() - interval '3 hours' THEN
    RAISE EXCEPTION 'ATP_PRACTICE_SPACING: espera 3 horas entre prácticas de %', NEW.source
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_electron_cap ON public.electron_logs;
CREATE TRIGGER trg_practice_electron_cap
  BEFORE INSERT ON public.electron_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_practice_electron_cap();
