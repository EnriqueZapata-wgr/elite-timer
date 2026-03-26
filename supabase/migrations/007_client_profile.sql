-- ============================================================
-- Migración: Perfil completo del cliente + tablero médico
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  date_of_birth DATE,
  biological_sex TEXT CHECK (biological_sex IN ('male', 'female', 'intersex')),
  gender TEXT,
  phone TEXT,
  occupation TEXT,
  marital_status TEXT,
  city TEXT,
  height_cm NUMERIC,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  exercise_type TEXT,
  exercise_frequency INT,
  exercise_duration INT,
  exercise_experience TEXT CHECK (exercise_experience IN ('beginner', 'intermediate', 'advanced', 'elite')),
  sport_goal TEXT,
  sleep_time_usual TIME,
  wake_time_usual TIME,
  sleep_hours_avg NUMERIC,
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 10),
  diet_type TEXT,
  meals_per_day INT,
  feeding_window TEXT,
  water_liters_day NUMERIC,
  caffeine_cups_day INT,
  alcohol_frequency TEXT,
  fasting_protocol TEXT,
  food_relationship_notes TEXT,
  food_allergies TEXT[],
  stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
  therapy_current BOOLEAN DEFAULT false,
  primary_goal TEXT,
  secondary_goals TEXT[],
  goal_timeline TEXT,
  coach_notes TEXT,
  nutrition_notes TEXT,
  action_plan TEXT,
  red_flags TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own profile" ON client_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client profile" ON client_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = client_profiles.user_id AND status = 'active')
);

CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  measured_by UUID REFERENCES profiles(id),
  weight_kg NUMERIC, body_fat_pct NUMERIC, muscle_mass_pct NUMERIC, visceral_fat NUMERIC,
  waist_cm NUMERIC, hip_cm NUMERIC, arm_cm NUMERIC, leg_cm NUMERIC, chest_cm NUMERIC,
  photo_front TEXT, photo_side TEXT, photo_back TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own measurements" ON body_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client measurements" ON body_measurements FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = body_measurements.user_id AND status = 'active')
);

CREATE TABLE condition_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  zone TEXT NOT NULL,
  condition_key TEXT NOT NULL,
  status TEXT CHECK (status IN ('not_evaluated', 'normal', 'observation', 'present')) DEFAULT 'not_evaluated',
  diagnosed_date DATE,
  notes TEXT,
  lab_value TEXT,
  medication TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, condition_key)
);

ALTER TABLE condition_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own flags" ON condition_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client flags" ON condition_flags FOR ALL USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = condition_flags.user_id AND status = 'active')
);

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  lab_date DATE NOT NULL,
  entered_by UUID REFERENCES profiles(id),
  glucose NUMERIC, hba1c NUMERIC, insulin NUMERIC, homa_ir NUMERIC,
  cholesterol_total NUMERIC, hdl NUMERIC, ldl NUMERIC, triglycerides NUMERIC,
  tsh NUMERIC, t3_free NUMERIC, t4_free NUMERIC,
  testosterone NUMERIC, estradiol NUMERIC, cortisol NUMERIC, dhea NUMERIC, progesterone NUMERIC,
  vitamin_d NUMERIC, vitamin_b12 NUMERIC, iron NUMERIC, ferritin NUMERIC, magnesium NUMERIC, zinc NUMERIC,
  pcr NUMERIC, homocysteine NUMERIC,
  alt NUMERIC, ast NUMERIC, ggt NUMERIC,
  creatinine NUMERIC, uric_acid NUMERIC, bun NUMERIC,
  hemoglobin NUMERIC, hematocrit NUMERIC, platelets NUMERIC, wbc NUMERIC,
  notes TEXT, pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own labs" ON lab_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client labs" ON lab_results FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = lab_results.user_id AND status = 'active')
);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL, dose TEXT, frequency TEXT, reason TEXT, prescriber TEXT,
  started_date DATE, ended_date DATE, is_active BOOLEAN DEFAULT true,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own meds" ON medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client meds" ON medications FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = medications.user_id AND status = 'active')
);

CREATE TABLE supplement_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL, dose TEXT, frequency TEXT, brand TEXT, reason TEXT,
  is_active BOOLEAN DEFAULT true, prescribed_by UUID REFERENCES profiles(id),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE supplement_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own supplements" ON supplement_protocols FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client supplements" ON supplement_protocols FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = supplement_protocols.user_id AND status = 'active')
);

CREATE TABLE family_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  relation TEXT NOT NULL, condition TEXT NOT NULL, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE family_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own history" ON family_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client history" ON family_history FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = family_history.user_id AND status = 'active')
);

CREATE INDEX idx_condition_flags_user ON condition_flags(user_id);
CREATE INDEX idx_body_measurements_user ON body_measurements(user_id, measured_at);
