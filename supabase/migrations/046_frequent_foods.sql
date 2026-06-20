-- Frecuentes por tipo de comida + tracking de source en food_logs

CREATE TABLE IF NOT EXISTS user_frequent_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner', 'other')),
  food_name TEXT NOT NULL,
  description TEXT,
  calories DECIMAL(6,1),
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  items JSONB DEFAULT '[]',
  times_used INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, meal_type, food_name)
);

ALTER TABLE user_frequent_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own frequent_foods" ON user_frequent_foods FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_frequent_foods_user_meal ON user_frequent_foods(user_id, meal_type, times_used DESC);

-- Agregar columnas de tracking a food_logs si no existen
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS was_edited BOOLEAN DEFAULT false;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
