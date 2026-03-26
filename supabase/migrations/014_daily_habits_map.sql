-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

CREATE TABLE client_daily_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  consultation_id UUID REFERENCES consultations(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('sleep', 'meal', 'work', 'exercise', 'commute', 'screen', 'social', 'hygiene', 'supplement', 'relaxation', 'other')) DEFAULT 'other',
  notes TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_daily_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own habits" ON client_daily_habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client habits" ON client_daily_habits FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = client_daily_habits.user_id AND status = 'active')
);

CREATE INDEX idx_daily_habits_user ON client_daily_habits(user_id);

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS habits_snapshot JSONB;
