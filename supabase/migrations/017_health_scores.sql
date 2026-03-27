-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

CREATE TABLE health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  consultation_id UUID REFERENCES consultations(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  functional_health_score NUMERIC,
  evaluation_quality NUMERIC,
  biological_age NUMERIC,
  aging_rate NUMERIC,
  domain_scores JSONB,
  pheno_age_detail JSONB,
  input_snapshot JSONB,
  sex TEXT,
  chronological_age INT
);

ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own scores" ON health_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client scores" ON health_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = health_scores.user_id AND status = 'active')
);

ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS albumin NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS alp NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS mcv NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS rdw NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS lymphocyte_pct NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS ldh NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS cpk NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS rheumatoid_factor NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS aso NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS iga NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS ige NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS igg NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS igm NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS free_iron NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS iron_binding NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS transferrin NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS sodium NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS potassium NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS chloride NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS folate NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS iron_saturation NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS urea NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS calcium_phosphorus NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS vldl NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS apo_b NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS sdldl NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS bilirubin NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS bilirubin_index NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS anti_tpo NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS anti_tg NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS fsh NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS prolactin NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS testosterone_free NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS lh NUMERIC;
