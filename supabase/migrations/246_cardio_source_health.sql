-- 246 · NOCTURNO B1 — el import de cardio nunca ha funcionado.
--
-- 036 creó cardio_sessions con CHECK (source IN ('manual','wearable','strava',
-- 'garmin')). 225 DECLARÓ en su comentario "ahora también 'health_connect' |
-- 'healthkit'" pero nunca escribió el ALTER: todo import de salud viola el
-- CHECK (23514) y los entrenamientos se caen juntos en un solo insert.
--
-- Idempotente por par DROP+ADD (patrón 070). El set nuevo es SUPERSET del
-- viejo: ADD CONSTRAINT valida las filas existentes y quitar un valor
-- rompería el push.
--
-- ⚠️ Antes del db push verificar el nombre real del constraint en la DB viva
-- (es el autogenerado de un CHECK inline; si difiriera, el DROP sería no-op y
-- el ADD crearía un segundo check aditivo que NO arregla nada):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'cardio_sessions'::regclass AND contype = 'c';

ALTER TABLE cardio_sessions DROP CONSTRAINT IF EXISTS cardio_sessions_source_check;
ALTER TABLE cardio_sessions ADD CONSTRAINT cardio_sessions_source_check
  CHECK (source IN ('manual', 'wearable', 'strava', 'garmin', 'health_connect', 'healthkit'));
