-- Migration 071: Edad ATP v2 — full schema
-- Step EDAD ATP Sprint 1/N — datos para el modelo Edad Integral v2.
-- Enrique ejecuta manualmente en Supabase SQL Editor (regla #12).

BEGIN;

-- ========================================
-- 1. edad_atp_calculations — cada cálculo de Edad Integral con timestamp
-- ========================================
CREATE TABLE IF NOT EXISTS edad_atp_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  chronological_age NUMERIC NOT NULL,
  edad_integral NUMERIC NOT NULL,
  algoritmo_excel NUMERIC NOT NULL,
  modificador_cognitivo NUMERIC DEFAULT 0,
  phenoage NUMERIC,
  sf_score NUMERIC,
  ritmo_envejecimiento NUMERIC,
  ce_integral NUMERIC, -- calidad de evaluación, 0-1
  edad_metabolica NUMERIC,
  edad_corporal NUMERIC,
  edad_cardiovascular NUMERIC,
  edad_fitness NUMERIC,
  edad_cognitiva NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edad_atp_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edad_atp_calculations_select_own" ON edad_atp_calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_calculations_insert_own" ON edad_atp_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_edad_atp_calculations_user_date ON edad_atp_calculations(user_id, calculated_at DESC);

-- ========================================
-- 2. edad_atp_biomarkers — biomarkers para PhenoAge + SF + sub-edades
-- ========================================
CREATE TABLE IF NOT EXISTS edad_atp_biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker_key TEXT NOT NULL, -- 'albumin', 'creatinine', 'glucose', 'insulin', 'hba1c', 'hdl', 'triglycerides', etc.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT, -- 'lab', 'manual', 'wearable', etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edad_atp_biomarkers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edad_atp_biomarkers_select_own" ON edad_atp_biomarkers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_biomarkers_insert_own" ON edad_atp_biomarkers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edad_atp_biomarkers_update_own" ON edad_atp_biomarkers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_biomarkers_delete_own" ON edad_atp_biomarkers FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_edad_atp_biomarkers_user_key_date ON edad_atp_biomarkers(user_id, biomarker_key, measured_at DESC);

-- ========================================
-- 3. edad_atp_body_composition — composición corporal (báscula inteligente)
-- ========================================
CREATE TABLE IF NOT EXISTS edad_atp_body_composition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_kg NUMERIC,
  height_cm NUMERIC,
  body_fat_pct NUMERIC,
  skeletal_muscle_pct NUMERIC,
  visceral_fat NUMERIC,
  grip_strength_kg NUMERIC,
  ffmi NUMERIC, -- calculado o ingresado
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edad_atp_body_composition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edad_atp_body_composition_select_own" ON edad_atp_body_composition FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_body_composition_insert_own" ON edad_atp_body_composition FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edad_atp_body_composition_update_own" ON edad_atp_body_composition FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_body_composition_delete_own" ON edad_atp_body_composition FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_edad_atp_body_composition_user_date ON edad_atp_body_composition(user_id, measured_at DESC);

-- ========================================
-- 4. edad_atp_functional_tests — tests funcionales (Cooper, push-up, balance, RT, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS edad_atp_functional_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_key TEXT NOT NULL, -- 'cooper_12min', 'push_up_max', 'one_leg_stand', 'reaction_time_simple', 'reaction_time_choice', 'plank', 'sit_to_stand_5x', 'old_man_test'
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value_primary NUMERIC NOT NULL, -- distancia, reps, segundos, ms según test
  value_secondary NUMERIC, -- score secundario opcional
  raw_data JSONB, -- datos crudos del test si aplica
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edad_atp_functional_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edad_atp_functional_tests_select_own" ON edad_atp_functional_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_functional_tests_insert_own" ON edad_atp_functional_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edad_atp_functional_tests_update_own" ON edad_atp_functional_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_functional_tests_delete_own" ON edad_atp_functional_tests FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_edad_atp_functional_tests_user_key_date ON edad_atp_functional_tests(user_id, test_key, measured_at DESC);

-- ========================================
-- 5. edad_atp_questionnaire_responses — respuestas de los 10 dominios
-- ========================================
CREATE TABLE IF NOT EXISTS edad_atp_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- 'metabolismo', 'habitos', 'cardiovascular', 'sueno', etc.
  parameter_key TEXT NOT NULL,
  value NUMERIC,
  value_text TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edad_atp_questionnaire_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edad_atp_questionnaire_responses_select_own" ON edad_atp_questionnaire_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_questionnaire_responses_insert_own" ON edad_atp_questionnaire_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edad_atp_questionnaire_responses_update_own" ON edad_atp_questionnaire_responses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "edad_atp_questionnaire_responses_delete_own" ON edad_atp_questionnaire_responses FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_edad_atp_questionnaire_user_domain_date ON edad_atp_questionnaire_responses(user_id, domain, measured_at DESC);

COMMIT;
