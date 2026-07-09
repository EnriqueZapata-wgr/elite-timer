-- 164_fix_convert_electrons_tasa.sql — Fix bug #142 tasa E-→H+ desincronizada
-- Rango Cowork/Fable 158-199. Sprint overnight 2026-07-08.
--
-- Bug (Fable lo flagueó en Sprint Braverman H+ delivery):
--   - Cliente src/services/economy/economy-config.ts línea 12:
--     BASE_CONVERSION = { electrons: 100, protons: 300 }  → 3 H+/E-
--   - RPC 091 convert_electrons_to_protons línea 115:
--     v_protons := (p_electrons::numeric * 30 * v_multiplier) → 30 H+/E-
--   - Preview del cliente 10× menor que débito real → user obtiene MÁS H+ de lo esperado
--
-- Causa raíz:
--   Normalización 2026-06-22 (Enrique) — 1 H+ = $0.01 MXN (era $0.001). Todos los
--   montos cliente divididos entre 10 (comentario en economy-config.ts). La RPC 091
--   se quedó con la escala vieja (×30 vs ×3 correcto).
--
-- Fix:
--   RPC pasa de ×30 a ×3. Coherente con:
--     - economy-config.ts BASE_CONVERSION
--     - Boost 24h = 500 H+ = $5 MXN
--     - Boost semanal = 3,000 H+ = $30 MXN
--     - Packages proton_packages (10K H+ = $99 MXN)
--     - Braverman PREMIUM = 1,000 H+ = $10 MXN
--
-- Impacto retroactivo: conversiones pasadas dieron ×10 de lo esperado (bug positivo
-- para users). NO se retrocede — ATP absorbe pérdida como lección. Fix futuro-only.
--
-- Idempotente: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION convert_electrons_to_protons(p_user_id uuid, p_electrons int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_electrons int; v_multiplier numeric := 1.0; v_protons bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_electrons <= 0 OR (p_electrons % 100) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT current_electrons INTO v_electrons FROM electron_balance WHERE user_id = p_user_id FOR UPDATE;
  IF COALESCE(v_electrons, 0) < p_electrons THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_electrons');
  END IF;

  SELECT COALESCE(MAX(c.electron_multiplier), 1.0) INTO v_multiplier
  FROM challenge_participants cp JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = p_user_id AND cp.status = 'active' AND c.active = true
    AND now()::date BETWEEN c.start_date AND c.end_date;

  -- FIX #142: tasa 3 H+/E- (era 30 pre-normalización 2026-06-22)
  -- BASE 100 E- = 300 H+, ajustada por multiplier de reto activo
  v_protons := (p_electrons::numeric * 3 * v_multiplier)::bigint;

  UPDATE electron_balance SET current_electrons = current_electrons - p_electrons, updated_at = now()
  WHERE user_id = p_user_id;
  INSERT INTO electron_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, -p_electrons, 'conversion_to_proton',
          jsonb_build_object('protons_gained', v_protons, 'multiplier', v_multiplier));

  INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, updated_at)
  VALUES (p_user_id, v_protons, v_protons, now())
  ON CONFLICT (user_id) DO UPDATE SET current_protons = proton_balance.current_protons + v_protons,
    lifetime_earned = proton_balance.lifetime_earned + v_protons, updated_at = now();
  INSERT INTO proton_transactions (user_id, amount, type, metadata)
  VALUES (p_user_id, v_protons, 'conversion_from_electron',
          jsonb_build_object('electrons_spent', p_electrons, 'multiplier', v_multiplier));

  RETURN jsonb_build_object('success', true, 'protons_gained', v_protons, 'multiplier', v_multiplier);
END; $$;

GRANT EXECUTE ON FUNCTION convert_electrons_to_protons(uuid, int) TO authenticated;

COMMENT ON FUNCTION convert_electrons_to_protons(uuid, int) IS
  '#142 fix — Tasa 3 H+/E- (era 30). Coherente con normalización 2026-06-22 (1 H+ = $0.01 MXN).';
