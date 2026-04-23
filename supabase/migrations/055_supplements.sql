-- 055 — Suplementos: plan personalizado + tracking diario

CREATE TABLE IF NOT EXISTS user_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  timing TEXT DEFAULT 'morning',
  source TEXT DEFAULT 'manual',
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own supplements" ON user_supplements FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  supplement_id UUID REFERENCES user_supplements(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, supplement_id, date)
);

ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own supplement_logs" ON supplement_logs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_supp_logs_user_date ON supplement_logs(user_id, date);
