-- ============================================================
-- Migración 027: Pilar de Nutrición completo
-- EJECUTAR EN: Supabase SQL Editor
-- TAMBIÉN: Crear bucket 'food-photos' en Storage (privado, 5MB)
-- ============================================================

-- Plan nutricional
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  diet_type TEXT,
  calorie_target INT,
  protein_target INT,
  carb_target INT,
  fat_target INT,
  fiber_target INT,
  water_target NUMERIC,
  feeding_window_start TIME,
  feeding_window_end TIME,
  fasting_hours INT,
  meals_per_day INT DEFAULT 3,
  meal_schedule JSONB DEFAULT '[]',
  foods_to_avoid JSONB DEFAULT '[]',
  foods_to_prioritize JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  supplement_notes TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'draft')) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own plans" ON nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client plans" ON nutrition_plans FOR ALL USING (
  auth.uid() = user_id OR auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = nutrition_plans.user_id AND status = 'active')
);

-- Food logs
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL,
  meal_time TIME,
  description TEXT NOT NULL,
  photo_url TEXT,
  ai_analysis JSONB,
  calories INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  hunger_level INT CHECK (hunger_level BETWEEN 1 AND 10),
  satisfaction_level INT CHECK (satisfaction_level BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own food logs" ON food_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client food logs" ON food_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = food_logs.user_id AND status = 'active')
);
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date DESC);

-- Hidratación
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  entries JSONB DEFAULT '[]',
  total_ml INT DEFAULT 0,
  target_ml INT DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own hydration" ON hydration_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client hydration" ON hydration_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = hydration_logs.user_id AND status = 'active')
);

-- Ayuno
CREATE TABLE IF NOT EXISTS fasting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  fast_start TIMESTAMPTZ,
  fast_end TIMESTAMPTZ,
  target_hours INT DEFAULT 16,
  actual_hours NUMERIC,
  broke_fast_with TEXT,
  energy_during INT CHECK (energy_during BETWEEN 1 AND 10),
  status TEXT CHECK (status IN ('active', 'completed', 'broken')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE fasting_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own fasting" ON fasting_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client fasting" ON fasting_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = fasting_logs.user_id AND status = 'active')
);

-- Recetas
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  prep_time_min INT,
  cook_time_min INT,
  servings INT DEFAULT 1,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  calories INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  fiber_g INT,
  protocol_ids JSONB DEFAULT '[]',
  diet_types JSONB DEFAULT '[]',
  photo_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public recipes visible to all" ON recipes FOR SELECT USING (is_public = true);
CREATE POLICY "Creator manages own recipes" ON recipes FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Coach clients see coach recipes" ON recipes FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = recipes.created_by AND client_id = auth.uid() AND status = 'active')
);

-- Score nutricional diario
CREATE TABLE IF NOT EXISTS daily_nutrition_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  overall_score INT,
  adherence_score INT,
  hydration_score INT,
  fasting_score INT,
  quality_score INT,
  total_calories INT,
  total_protein INT,
  total_carbs INT,
  total_fat INT,
  meals_logged INT,
  water_ml INT,
  fasting_hours NUMERIC,
  red_flags JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_nutrition_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own scores" ON daily_nutrition_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client scores" ON daily_nutrition_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = daily_nutrition_scores.user_id AND status = 'active')
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('food-photos', 'food-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own food photos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own food photos" ON storage.objects FOR SELECT
USING (bucket_id = 'food-photos' AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = (storage.foldername(name))[1]::uuid AND status = 'active')
));
