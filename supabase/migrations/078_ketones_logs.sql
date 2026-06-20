-- ============================================================================
-- 078 — KETONES LOGS: Registro de cetonas en sangre (β-hidroxibutirato)
-- Espejo de glucose_logs (040). Valor en mmol/L (decimal, no entero como glucosa).
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ketones_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  value_mmol NUMERIC(4,2) NOT NULL,  -- β-hidroxibutirato en sangre, mmol/L (0.0–8.0 típico)
  context TEXT CHECK (context IN ('fasting', 'post_meal', 'post_exercise', 'random', 'bedtime')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ketones_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ketones" ON ketones_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ketones_user_date ON ketones_logs(user_id, date);
