-- ============================================================
-- Migración: Histórico de consultas con snapshots
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consultation_number INT,
  conditions_snapshot JSONB,
  body_snapshot JSONB,
  biomarkers_snapshot JSONB,
  lab_result_id UUID REFERENCES lab_results(id),
  medications_snapshot JSONB,
  supplements_snapshot JSONB,
  chief_complaint TEXT,
  subjective_notes TEXT,
  objective_notes TEXT,
  assessment TEXT,
  plan TEXT,
  ai_analysis TEXT,
  general_notes TEXT,
  changes_summary JSONB,
  duration_minutes INT,
  next_appointment DATE,
  status TEXT CHECK (status IN ('draft', 'completed', 'signed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own consultations" ON consultations FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Client sees own consultations" ON consultations FOR SELECT USING (auth.uid() = client_id);

CREATE INDEX idx_consultations_client ON consultations(client_id, consultation_date DESC);
CREATE INDEX idx_consultations_coach ON consultations(coach_id);

CREATE OR REPLACE FUNCTION create_consultation_snapshot(p_coach_id UUID, p_client_id UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_num INT;
  v_conds JSONB;
  v_body JSONB;
  v_bio JSONB;
  v_lab UUID;
  v_meds JSONB;
  v_supps JSONB;
  v_changes JSONB;
  v_prev_body JSONB;
BEGIN
  SELECT COALESCE(MAX(consultation_number), 0) + 1 INTO v_num
  FROM consultations WHERE client_id = p_client_id AND coach_id = p_coach_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'condition_key', condition_key, 'zone', zone, 'status', status,
    'notes', notes, 'lab_value', lab_value, 'medication', medication
  )), '[]'::jsonb) INTO v_conds
  FROM condition_flags WHERE user_id = p_client_id AND status != 'not_evaluated';

  SELECT jsonb_build_object(
    'weight_kg', weight_kg, 'body_fat_pct', body_fat_pct,
    'muscle_mass_pct', muscle_mass_pct, 'visceral_fat', visceral_fat,
    'waist_cm', waist_cm, 'hip_cm', hip_cm, 'chest_cm', chest_cm,
    'arm_cm', arm_cm, 'leg_cm', leg_cm, 'body_water_pct', body_water_pct,
    'measured_at', measured_at
  ) INTO v_body FROM body_measurements WHERE user_id = p_client_id ORDER BY measured_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'grip_strength_kg', grip_strength_kg, 'blood_pressure_sys', blood_pressure_sys,
    'blood_pressure_dia', blood_pressure_dia, 'vo2_max', vo2_max,
    'metabolic_age_impedance', metabolic_age_impedance
  ) INTO v_bio FROM client_profiles WHERE user_id = p_client_id;

  SELECT id INTO v_lab FROM lab_results WHERE user_id = p_client_id ORDER BY lab_date DESC LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'dose', dose, 'frequency', frequency, 'reason', reason)), '[]'::jsonb)
  INTO v_meds FROM medications WHERE user_id = p_client_id AND is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'dose', dose, 'frequency', frequency, 'brand', brand)), '[]'::jsonb)
  INTO v_supps FROM supplement_protocols WHERE user_id = p_client_id AND is_active = true;

  SELECT body_snapshot INTO v_prev_body FROM consultations
  WHERE client_id = p_client_id AND coach_id = p_coach_id AND status = 'completed'
  ORDER BY consultation_date DESC LIMIT 1;

  v_changes := jsonb_build_object(
    'weight_change', CASE WHEN v_body IS NOT NULL AND v_prev_body IS NOT NULL
      THEN (v_body->>'weight_kg')::numeric - (v_prev_body->>'weight_kg')::numeric ELSE NULL END,
    'fat_change', CASE WHEN v_body IS NOT NULL AND v_prev_body IS NOT NULL
      THEN (v_body->>'body_fat_pct')::numeric - (v_prev_body->>'body_fat_pct')::numeric ELSE NULL END,
    'is_first', v_prev_body IS NULL
  );

  INSERT INTO consultations (
    client_id, coach_id, consultation_number, conditions_snapshot, body_snapshot,
    biomarkers_snapshot, lab_result_id, medications_snapshot, supplements_snapshot,
    changes_summary, status
  ) VALUES (
    p_client_id, p_coach_id, v_num, v_conds, v_body, v_bio, v_lab, v_meds, v_supps, v_changes, 'draft'
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
