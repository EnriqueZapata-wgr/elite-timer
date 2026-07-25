-- 225 · MB-3.6 Bloque 3 — import de salud + la sesión unifica fuerza y cardio.
-- Idempotente. cardio_sessions ya tiene RLS owner (036/038) — solo columnas.

-- 3.2 · Import Health Connect / HealthKit:
--   source ya existe ('manual'); ahora también 'health_connect' | 'healthkit'.
--   external_id = uuid del entrenamiento en el proveedor → candado #1 del
--   dedupe (único por usuario; parcial porque el manual no lo trae).
ALTER TABLE cardio_sessions ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cardio_sessions_external
  ON cardio_sessions(user_id, external_id)
  WHERE external_id IS NOT NULL;

-- 3.3 · workout_sessions agrupa fuerza + cardio del mismo día: el cardio del
-- día se ADOPTA por la sesión de fuerza al guardarla (link aditivo, cero
-- reescritura del camino de cardio existente).
ALTER TABLE cardio_sessions ADD COLUMN IF NOT EXISTS workout_session_id UUID
  REFERENCES workout_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_workout
  ON cardio_sessions(workout_session_id)
  WHERE workout_session_id IS NOT NULL;

COMMENT ON COLUMN cardio_sessions.external_id IS
  'ID del entrenamiento en el proveedor de salud (Health Connect/HealthKit) — dedupe de import (MB-3.6).';
COMMENT ON COLUMN cardio_sessions.workout_session_id IS
  'Sesión de fuerza del día que adoptó este cardio (MB-3.6: la sesión unifica).';
