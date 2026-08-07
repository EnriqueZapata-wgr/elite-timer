-- 257 · MB-27 Pieza 2 — scheduled_routines aprende autoasignación por enfoque.
--
-- Dictamen (brief 2.1): la tabla de la migración 001 SÍ sirve para que el
-- usuario se agende a sí mismo — la RLS owner (FOR ALL, auth.uid() = user_id)
-- ya lo permite y assigned_by acepta al propio usuario. Lo que NO cubría es
-- el flujo real del usuario: el generador determinista trabaja por ENFOQUE
-- (full_body, empuje, pierna...) y no persiste filas en `routines`, así que
-- `routine_id NOT NULL` obligaba a tener rutina guardada para agendar.
--
-- El ALTER mínimo: routine_id se vuelve opcional y entra `focus` — una fila
-- agenda O una rutina guardada O un enfoque del generador. Cero tablas
-- nuevas. El RPC get_today_routines NO se toca: su INNER JOIN a routines
-- ignora filas de enfoque, y el panel de coach sigue viendo exactamente lo
-- suyo. El cliente resuelve "hoy" en LOCAL (plan-semanal-core) porque el
-- CURRENT_DATE del RPC es zona del servidor: a las 7pm de CDMX ya es mañana
-- en UTC y el RPC contestaría el día equivocado.
--
-- Idempotente. RLS ya existe (mig 001). db push ANTES del OTA.

ALTER TABLE scheduled_routines ALTER COLUMN routine_id DROP NOT NULL;

ALTER TABLE scheduled_routines ADD COLUMN IF NOT EXISTS focus TEXT
  CHECK (focus IN ('full_body', 'tren_superior', 'empuje', 'traccion', 'pierna_empuje', 'pierna_traccion'));

-- Toda fila agenda algo: rutina guardada o enfoque (las filas viejas todas
-- traen routine_id, pasan solas).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scheduled_routines_target_check'
      AND conrelid = 'scheduled_routines'::regclass
  ) THEN
    ALTER TABLE scheduled_routines
      ADD CONSTRAINT scheduled_routines_target_check
      CHECK (routine_id IS NOT NULL OR focus IS NOT NULL);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
