-- ============================================================================
-- 194 — Consolidación de suplementos: supplement_protocols (007, era coach)
--       deja de ser fuente de verdad → user_supplements (055) queda como ÚNICA.
--       (Megabuzón 2da pasada B.2, decisión #39.)
--
-- ⚠️ CORRECCIÓN DE PREMISA (verificado contra repo + DB remota 2026-07-13):
--   El buzón nombraba una tabla "supplement_scan" — NO EXISTE ni en migraciones
--   ni en el remoto. `supplement_scan` es solo un ActionKey de economía (086) y
--   un requestType de ARGOS; el resultado del scan BHA ya persiste en columnas
--   de user_supplements (187). La tabla legacy "parecida" real es
--   supplement_protocols (007): name/dose/frequency/brand/reason/is_active.
--   Estado remoto al escribir esto: supplement_protocols = 0 filas,
--   user_supplements = 55 filas.
--
-- Qué hace esta migración:
--   1. Policy de coach en user_supplements (espejo de la que tenía la legacy
--      en 007) — sin ella el panel coach (ClientDetailScreen / atp-ai-service)
--      leería [] por RLS al apuntar a user_supplements.
--   2. Backfill legacy → user_supplements con INSERT SELECT filtrando
--      huérfanos vía INNER JOIN auth.users (aprendizaje mig 177:
--      supplement_protocols.user_id referencia profiles, user_supplements
--      referencia auth.users — sin el filtro el FK aborta la transacción).
--      Dedup por (user_id, name) case-insensitive → idempotente.
--      Mapeo: dose→dosage (NOT NULL, fallback '—'), frequency→dose_pattern
--      (texto libre: expectedDaysPerWeek() trata patrón desconocido como
--      diario, igual que NULL — sin impacto en adherencia), brand→brand,
--      reason→reason, notes→notes, source='coach_legacy'. prescribed_by no
--      se migra (UUID coach; con 0 filas remotas no hay pérdida real).
--   3. create_consultation_snapshot() (010) pasa a snapshotear desde
--      user_supplements manteniendo las MISMAS keys del JSON
--      ('name','dose','frequency','brand') → consumidores de
--      supplements_snapshot no cambian.
--
-- ❌ NO se dropea supplement_protocols todavía — GATED a peloteo con Enrique:
--   handle_new_user() (024) hace UPDATE sobre ella en cada signup; dropearla
--   sin reescribir ese trigger ROMPERÍA EL SIGNUP (semana de beta). El DROP va
--   en migración futura junto con la limpieza del trigger, tras validar en
--   beta que nada más la toca.
--
-- Doctrina intacta: suplementos son REGISTRO, no recomendación. El acceso
-- coach requiere relación coach_clients ACTIVA (mismo patrón que medications,
-- condition_flags, etc. de 007) — cero superficie pública nueva.
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — Enrique corre
-- `npx supabase db push` tras el merge + audit Cowork (regla #12).
-- ============================================================================

-- 1. Policy coach (espejo de "Coach sees client supplements" de 007).
DROP POLICY IF EXISTS "Coach sees client supplements" ON user_supplements;
CREATE POLICY "Coach sees client supplements" ON user_supplements FOR ALL USING (
  EXISTS (
    SELECT 1 FROM coach_clients
    WHERE coach_id = auth.uid()
      AND client_id = user_supplements.user_id
      AND status = 'active'
  )
);

-- 2. Backfill legacy → user_supplements (huérfanos fuera, dedup, idempotente).
INSERT INTO user_supplements
  (user_id, name, dosage, timing, source, reason, is_active, created_at, brand, dose_pattern, notes)
SELECT
  sp.user_id,
  sp.name,
  COALESCE(NULLIF(btrim(sp.dose), ''), '—'),
  'morning',
  'coach_legacy',
  sp.reason,
  COALESCE(sp.is_active, true),
  COALESCE(sp.created_at, NOW()),
  sp.brand,
  NULLIF(btrim(sp.frequency), ''),
  sp.notes
FROM supplement_protocols sp
INNER JOIN auth.users u ON u.id = sp.user_id   -- filtra huérfanos (patrón 177)
WHERE NOT EXISTS (
  SELECT 1 FROM user_supplements us
  WHERE us.user_id = sp.user_id AND lower(us.name) = lower(sp.name)
);

-- 3. Snapshot de consultas desde user_supplements (mismas keys JSON).
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

  -- 194: fuente única user_supplements (antes supplement_protocols).
  -- Keys del JSON sin cambio para no romper consumidores del snapshot.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'dose', dosage, 'frequency', dose_pattern, 'brand', brand)), '[]'::jsonb)
  INTO v_supps FROM user_supplements WHERE user_id = p_client_id AND is_active = true;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
