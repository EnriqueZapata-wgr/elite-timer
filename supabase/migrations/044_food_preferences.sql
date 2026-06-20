-- ============================================================================
-- 044 — FOOD PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS food_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  diet_type TEXT DEFAULT 'omnivore',
  allergies TEXT[] DEFAULT '{}',
  dislikes TEXT,
  cooking_style TEXT DEFAULT 'both',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE food_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own food_prefs" ON food_preferences
  FOR ALL USING (auth.uid() = user_id);
