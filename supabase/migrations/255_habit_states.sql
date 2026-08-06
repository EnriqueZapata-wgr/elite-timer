-- 255 · MB-26 Pieza 1 — Los tres estados del hábito.
--
-- HOY tenía puerta de entrada y no tenía puerta de salida: un hábito solo
-- podía estar encendido o apagado, y todo lo encendido vivía en la lista
-- para siempre. Esta tabla agrega la salida SIN borrar nada:
--
--   activo   → lo estás trabajando ahora. Ocupa renglón en HOY.
--   graduado → ya es parte de ti. Sale de la lista, se sigue midiendo
--              (los verificados siguen otorgando su electrón con actividad
--              real, y reportes y Edad ATP siguen contando su historial).
--   reposo   → no ahorita. Sale de HOY, conserva historial y racha.
--
-- QUIEN NO TIENE FILA = ACTIVO: el comportamiento de siempre. Nadie pierde
-- nada al actualizar; la tabla solo crece cuando el usuario decide.
--
-- Idempotente. RLS owner-only. db push ANTES del OTA.

CREATE TABLE IF NOT EXISTS user_habit_states (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'activo' CHECK (state IN ('activo', 'graduado', 'reposo')),
  graduated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, habit_key)
);

ALTER TABLE user_habit_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_habit_states'
      AND policyname = 'Users own habit states'
  ) THEN
    CREATE POLICY "Users own habit states" ON user_habit_states
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
