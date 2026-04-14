-- 049 — Historial de sesiones mentales (respiración, meditación, checkin)

CREATE TABLE IF NOT EXISTS mind_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('breathing', 'meditation', 'checkin')),
  template_id TEXT,
  template_name TEXT,
  duration_seconds INTEGER,
  rounds_completed INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mind_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own mind_sessions" ON mind_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_mind_sessions_user_date ON mind_sessions(user_id, date);
