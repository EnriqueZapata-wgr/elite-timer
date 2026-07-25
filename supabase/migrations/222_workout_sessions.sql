-- ============================================================================
-- 222 — WORKOUT SESSIONS (MB-3 Track D): entidad "sesión" de fuerza.
--
-- Hoy fuerza son filas sueltas en exercise_logs sin agrupar (cardio sí tiene
-- sesiones). Esta tabla agrupa un entrenamiento completo: ejercicios, sets,
-- duración, volumen y su señal de Edad ATP (Track C).
--
-- Además:
--  · exercise_logs.session_id  → agrupa los sets bajo su sesión.
--  · exercise_logs.matrix_slug → traza el set al catálogo matriceado (220).
--  · exercises.matrix_slug     → puente 1:1 ejercicio-app ↔ fila de la matriz
--    (el registro/PRs siguen viviendo en exercises/exercise_logs — cero
--    reescritura del camino existente; el catálogo nuevo se engancha).
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — db push tras merge.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workout_sessions (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  date             date NOT NULL,                -- fecha LOCAL del cliente (getLocalToday, regla #3)
  started_at       timestamptz,
  ended_at         timestamptz,
  duration_seconds integer,
  source           text NOT NULL DEFAULT 'generada' CHECK (source IN ('generada', 'manual')),
  routine_name     text,
  -- Snapshot del plan generado (GeneratedRoutine) para repetir/auditar.
  plan             jsonb,
  exercises_count  integer NOT NULL DEFAULT 0,
  sets_count       integer NOT NULL DEFAULT 0,
  volume_kg        numeric NOT NULL DEFAULT 0,
  prs_count        integer NOT NULL DEFAULT 0,
  -- Señal Edad ATP del cierre (Tier A alimentado + proyección Tier B).
  edad_signal      jsonb,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
  ON workout_sessions (user_id, date DESC);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workout_sessions' AND policyname = 'workout_sessions_owner_all'
  ) THEN
    CREATE POLICY workout_sessions_owner_all
      ON workout_sessions FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Enlaces en tablas existentes (aditivo, cero reescritura) ──

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES workout_sessions (id) ON DELETE SET NULL;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS matrix_slug text;

CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs (session_id);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS matrix_slug text;

-- Único parcial: cada fila de la matriz mapea a lo más a UN ejercicio-app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_matrix_slug
  ON exercises (matrix_slug) WHERE matrix_slug IS NOT NULL;
