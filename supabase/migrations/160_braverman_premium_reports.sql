-- 160_braverman_premium_reports.sql — Cache del reporte PREMIUM ARGOS (#90)
-- Rango Fable: 158-199. Marathon V1.4 F5.
--
-- Un reporte por resultado de test (UNIQUE braverman_result_id): si el user
-- repite el test hay nuevo result_id → nuevo reporte. Evita re-generar (LLM
-- caro, 30-60s). El cliente inserta su propio cache (RLS own-row).

CREATE TABLE IF NOT EXISTS braverman_premium_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  braverman_result_id UUID NOT NULL REFERENCES braverman_results(id) ON DELETE CASCADE,
  report_markdown TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (braverman_result_id)
);

CREATE INDEX IF NOT EXISTS idx_braverman_premium_user
  ON braverman_premium_reports(user_id, created_at DESC);

ALTER TABLE braverman_premium_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_braverman_premium_select" ON braverman_premium_reports;
CREATE POLICY "own_braverman_premium_select" ON braverman_premium_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_braverman_premium_insert" ON braverman_premium_reports;
CREATE POLICY "own_braverman_premium_insert" ON braverman_premium_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE braverman_premium_reports IS
  '#90 — Reporte PREMIUM ARGOS del test Braverman. Cache por resultado.';
