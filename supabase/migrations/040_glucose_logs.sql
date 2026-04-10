-- ============================================================================
-- 040 — GLUCOSE LOGS: Registro de glucosa en sangre
-- ============================================================================

CREATE TABLE IF NOT EXISTS glucose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  value_mg_dl INTEGER NOT NULL,
  context TEXT CHECK (context IN ('fasting', 'pre_meal', 'post_meal_1h', 'post_meal_2h', 'random', 'bedtime')),
  related_meal_type TEXT,
  related_food_log_id UUID REFERENCES food_logs(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE glucose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own glucose" ON glucose_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_glucose_user_date ON glucose_logs(user_id, date);
