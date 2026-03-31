-- ============================================================
-- Migración 030: Tabla de mediciones de salud del usuario
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS health_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Composición corporal
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  body_fat_pct DECIMAL(4,1),
  muscle_mass_kg DECIMAL(5,2),
  visceral_fat INTEGER,
  waist_cm DECIMAL(5,1),
  hip_cm DECIMAL(5,1),
  neck_cm DECIMAL(4,1),

  -- Cardiovascular
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  resting_hr INTEGER,

  -- Fuerza
  grip_strength_kg DECIMAL(4,1),

  -- Subjetivos (1-10)
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  mood_level INTEGER CHECK (mood_level BETWEEN 1 AND 10),

  -- Sueño
  sleep_hours DECIMAL(3,1),

  -- Actividad
  steps_daily INTEGER,
  exercise_min_weekly INTEGER,
  vo2max_estimate DECIMAL(4,1),

  -- Metadata
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own measurements" ON health_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client measurements" ON health_measurements FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = health_measurements.user_id AND status = 'active')
);

CREATE INDEX idx_health_measurements_date ON health_measurements(user_id, date DESC);
