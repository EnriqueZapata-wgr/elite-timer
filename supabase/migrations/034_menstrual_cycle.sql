-- ============================================================
-- Migración 034: Sistema de ciclo menstrual
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS cycle_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  flow_intensity TEXT CHECK (flow_intensity IN ('light', 'medium', 'heavy', 'spotting')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycle_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  cycle_day INTEGER,
  phase TEXT CHECK (phase IN ('menstrual', 'follicular', 'ovulation', 'luteal')),
  cramps INTEGER DEFAULT 0,
  bloating INTEGER DEFAULT 0,
  headache INTEGER DEFAULT 0,
  energy_level INTEGER,
  mood_level INTEGER,
  anxiety_level INTEGER DEFAULT 0,
  sleep_quality INTEGER,
  libido INTEGER,
  cravings TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS cycle_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  is_tracking BOOLEAN DEFAULT true,
  avg_cycle_length INTEGER DEFAULT 28,
  avg_period_length INTEGER DEFAULT 5,
  mode TEXT DEFAULT 'full' CHECK (mode IN ('full', 'companion')),
  share_with_partner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cycle_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own periods" ON cycle_periods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User manages own symptoms" ON cycle_symptoms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User manages own cycle settings" ON cycle_settings FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_cycle_periods_user ON cycle_periods(user_id, start_date DESC);
CREATE INDEX idx_cycle_symptoms_date ON cycle_symptoms(user_id, date DESC);
