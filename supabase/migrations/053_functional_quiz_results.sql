CREATE TABLE IF NOT EXISTS functional_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id TEXT NOT NULL, -- 'sleep_functional', 'energy_functional', etc.
  domain_scores JSONB DEFAULT '{}', -- { "cortisol": 5, "circadian": 3, ... }
  active_insights JSONB DEFAULT '[]', -- insights que superaron threshold
  responses JSONB DEFAULT '{}', -- { "S01": true, "S02": false, ... }
  current_question INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE functional_quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own functional_quiz_results" ON functional_quiz_results
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fqr_user_quiz ON functional_quiz_results(user_id, quiz_id, created_at DESC);
