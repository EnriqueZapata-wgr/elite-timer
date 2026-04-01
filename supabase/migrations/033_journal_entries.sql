-- ============================================================
-- Migración 033: Journal entries
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt TEXT,
  content TEXT NOT NULL,
  mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 10),
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 10),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(user_id, date DESC);
