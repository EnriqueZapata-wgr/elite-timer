-- 074_fitness_kinematic_tests.sql
-- Tabla dedicada para los 4 tests cinemáticos de fitness (plank, BOLT, old_man_test,
-- recovery_hr). Registro rico (unit + notes + timestamp). El MOTOR ya los lee por
-- passthrough desde edad_atp_functional_tests, así que el servicio escribe en AMBAS:
-- esta tabla (expediente dedicado) y edad_atp_functional_tests (fuente del motor).
--
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE. Enrique la corre manual en Supabase SQL Editor
--    (regla #12 del CLAUDE.md). Idempotente. Mientras no se corra, el servicio sigue
--    alimentando el motor vía edad_atp_functional_tests (degradación suave, sin crash).

CREATE TABLE IF NOT EXISTS fitness_kinematic_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id),
  test_key     text NOT NULL,  -- 'plank' | 'bolt' | 'old_man_test' | 'recovery_hr'
  value        numeric NOT NULL,
  unit         text NOT NULL,  -- 'seconds' | 'points' | 'bpm'
  measured_at  timestamptz NOT NULL DEFAULT now(),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fitness_kinematic_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own kinematic tests" ON fitness_kinematic_tests;
DROP POLICY IF EXISTS "Coach manages client kinematic tests" ON fitness_kinematic_tests;
CREATE POLICY "User manages own kinematic tests" ON fitness_kinematic_tests
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client kinematic tests" ON fitness_kinematic_tests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM coach_clients cc
            WHERE cc.coach_id = auth.uid() AND cc.client_id = fitness_kinematic_tests.user_id AND cc.status = 'active')
  );

CREATE INDEX IF NOT EXISTS idx_kinematic_latest
  ON fitness_kinematic_tests (user_id, test_key, measured_at DESC);
