CREATE TABLE IF NOT EXISTS user_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]',
  total_calories INTEGER DEFAULT 0,
  total_protein DECIMAL(5,1) DEFAULT 0,
  total_carbs DECIMAL(5,1) DEFAULT 0,
  total_fat DECIMAL(5,1) DEFAULT 0,
  meal_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own recipes" ON user_recipes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_user ON user_recipes(user_id, created_at DESC);
