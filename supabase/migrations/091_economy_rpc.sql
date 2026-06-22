-- 091_economy_rpc.sql — Economía Protones H+ : RPCs atómicas (mutación segura)
--
-- POR QUÉ EXISTE (no estaba en el handoff, pero es OBLIGATORIO para "bulletproof"):
-- las tablas de balance/tx son SELECT-only para el usuario (082-085, 090). TODA mutación
-- de moneda pasa por estas funciones SECURITY DEFINER, atómicas (insert tx + update balance
-- en una transacción), con bloqueo de fila (FOR UPDATE) anti-doble-gasto.
--
-- MODELO DE PERMISOS (anti-minteo):
--   • DEBITO / conversión / join (no acreditan dinero al caller arbitrariamente) →
--     EXECUTE a `authenticated`, con check p_user_id = auth.uid().
--   • CRÉDITO (award_electrons/award_protons/settle prize) → EXECUTE solo `service_role`.
--     El cliente NO puede auto-acreditarse. Los premios/bonos los emite el servidor.
--   ⚠️ FLAG: el award de electrones por hábito hoy es client-trigger → al activar la feature
--     debe moverse a un path validado por servidor (edge fn / trigger). Ver COWORK_REPORT.
--
-- Idempotente (CREATE OR REPLACE). ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

-- ── Curva de rank (placeholder calibrable — el doc económico tiene la curva final) ──
CREATE OR REPLACE FUNCTION economy_rank_from_lifetime(p_lifetime int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(99, GREATEST(1, (1 + floor(sqrt(GREATEST(p_lifetime, 0)::numeric / 50)))::int));
$$;

-- ── award_electrons (CRÉDITO E-, service_role) ──
CREATE OR REPLACE FUNCTION award_electrons(
  p_user_id uuid, p_amount int, p_reason text,
  p_metadata jsonb DEFAULT NULL, p_idempotency_key text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount = 0 THEN RETURN; END IF;
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM electron_transactions
    WHERE user_id = p_user_id AND metadata->>'idempotency_key' = p_idempotency_key
  ) THEN RETURN; END IF; -- anti-doble-conteo

  INSERT INTO electron_balance (user_id, current_electrons, lifetime_electrons, current_rank, updated_at)
  VALUES (p_user_id, GREATEST(p_amount, 0), GREATEST(p_amount, 0),
          economy_rank_from_lifetime(GREATEST(p_amount, 0)), now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_electrons  = GREATEST(0, electron_balance.current_electrons + p_amount),
    lifetime_electrons = electron_balance.lifetime_electrons + GREATEST(p_amount, 0),
    current_rank       = economy_rank_from_lifetime(electron_balance.lifetime_electrons + GREATEST(p_amount, 0)),
    updated_at = now();

  INSERT INTO electron_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason,
          COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key));
END; $$;

-- ── award_protons (CRÉDITO H+, service_role) ──
CREATE OR REPLACE FUNCTION award_protons(
  p_user_id uuid, p_amount bigint, p_type text,
  p_action_key text DEFAULT NULL, p_metadata jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;
  INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_protons = proton_balance.current_protons + p_amount,
    lifetime_earned = proton_balance.lifetime_earned + p_amount, updated_at = now();
  INSERT INTO proton_transactions (user_id, amount, type, action_key, metadata)
  VALUES (p_user_id, p_amount, p_type, p_action_key, p_metadata);
END; $$;

-- ── spend_protons (DÉBITO H+, authenticated) ──
CREATE OR REPLACE FUNCTION spend_protons(
  p_user_id uuid, p_amount bigint, p_action_key text, p_metadata jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_amount'); END IF;

  SELECT current_protons INTO v_balance FROM proton_balance WHERE user_id = p_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'new_balance', v_balance, 'error', 'insufficient_protons');
  END IF;

  UPDATE proton_balance SET current_protons = current_protons - p_amount,
    lifetime_spent = lifetime_spent + p_amount, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO proton_transactions (user_id, amount, type, action_key, metadata)
  VALUES (p_user_id, -p_amount, 'action_spent', p_action_key, p_metadata);

  RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
END; $$;

-- ── convert_electrons_to_protons (DÉBITO E- → CRÉDITO H+, authenticated; tasa SERVIDOR) ──
-- El cliente solo pasa electrones; los protones se calculan aquí (100 E- = 3000 H+ → 30/E-)
-- × multiplier de reto activo. Así el cliente NO puede inflar la tasa.
CREATE OR REPLACE FUNCTION convert_electrons_to_protons(p_user_id uuid, p_electrons int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_electrons int; v_multiplier numeric := 1.0; v_protons bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_electrons <= 0 OR (p_electrons % 100) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount'); -- múltiplos de 100
  END IF;

  SELECT current_electrons INTO v_electrons FROM electron_balance WHERE user_id = p_user_id FOR UPDATE;
  IF COALESCE(v_electrons, 0) < p_electrons THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_electrons');
  END IF;

  SELECT COALESCE(MAX(c.electron_multiplier), 1.0) INTO v_multiplier
  FROM challenge_participants cp JOIN challenges c ON c.id = cp.challenge_id
  WHERE cp.user_id = p_user_id AND cp.status = 'active' AND c.active = true
    AND now()::date BETWEEN c.start_date AND c.end_date;

  v_protons := (p_electrons::numeric * 30 * v_multiplier)::bigint; -- BASE 100E-=3000H+

  -- Débito E- (NO toca lifetime_electrons → el rank es permanente).
  UPDATE electron_balance SET current_electrons = current_electrons - p_electrons, updated_at = now()
  WHERE user_id = p_user_id;
  INSERT INTO electron_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, -p_electrons, 'conversion_to_proton',
          jsonb_build_object('protons_gained', v_protons, 'multiplier', v_multiplier));

  -- Crédito H+.
  INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, updated_at)
  VALUES (p_user_id, v_protons, v_protons, now())
  ON CONFLICT (user_id) DO UPDATE SET current_protons = proton_balance.current_protons + v_protons,
    lifetime_earned = proton_balance.lifetime_earned + v_protons, updated_at = now();
  INSERT INTO proton_transactions (user_id, amount, type, metadata)
  VALUES (p_user_id, v_protons, 'conversion_from_electron',
          jsonb_build_object('electrons_spent', p_electrons, 'multiplier', v_multiplier));

  RETURN jsonb_build_object('success', true, 'protons_gained', v_protons, 'multiplier', v_multiplier);
END; $$;

-- ── join_challenge (DÉBITO entry cost + alta participante, authenticated) ──
CREATE OR REPLACE FUNCTION join_challenge(p_user_id uuid, p_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cost int; v_active boolean; v_balance bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT entry_cost_protons, active INTO v_cost, v_active FROM challenges WHERE id = p_challenge_id;
  IF v_cost IS NULL OR NOT v_active THEN RETURN jsonb_build_object('success', false, 'error', 'challenge_unavailable'); END IF;
  IF EXISTS (SELECT 1 FROM challenge_participants WHERE user_id = p_user_id AND challenge_id = p_challenge_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_joined');
  END IF;

  IF v_cost > 0 THEN
    SELECT current_protons INTO v_balance FROM proton_balance WHERE user_id = p_user_id FOR UPDATE;
    IF COALESCE(v_balance, 0) < v_cost THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_protons'); END IF;
    UPDATE proton_balance SET current_protons = current_protons - v_cost,
      lifetime_spent = lifetime_spent + v_cost, updated_at = now() WHERE user_id = p_user_id;
    INSERT INTO proton_transactions (user_id, amount, type, metadata)
    VALUES (p_user_id, -v_cost, 'reto_entry', jsonb_build_object('challenge_id', p_challenge_id));
  END IF;

  INSERT INTO challenge_participants (user_id, challenge_id, status) VALUES (p_user_id, p_challenge_id, 'active');
  RETURN jsonb_build_object('success', true, 'cost', v_cost);
END; $$;

-- ── settle_challenge (CRÉDITO premio, service_role — validación de criterio server-side) ──
CREATE OR REPLACE FUNCTION settle_challenge(p_user_id uuid, p_challenge_id uuid, p_won boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prize int; v_awarded boolean;
BEGIN
  SELECT prize_awarded INTO v_awarded FROM challenge_participants
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id FOR UPDATE;
  IF v_awarded IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_participant'); END IF;
  IF v_awarded THEN RETURN jsonb_build_object('success', false, 'error', 'already_settled'); END IF;

  IF p_won THEN
    SELECT prize_protons INTO v_prize FROM challenges WHERE id = p_challenge_id;
    UPDATE challenge_participants SET status = 'completed', completed_at = now(), prize_awarded = true
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
    PERFORM award_protons(p_user_id, v_prize::bigint, 'reto_prize', NULL, jsonb_build_object('challenge_id', p_challenge_id));
    RETURN jsonb_build_object('success', true, 'won', true, 'prize', v_prize);
  ELSE
    UPDATE challenge_participants SET status = 'failed', completed_at = now(), prize_awarded = true
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
    RETURN jsonb_build_object('success', true, 'won', false, 'prize', 0);
  END IF;
END; $$;

-- ── PERMISOS (anti-minteo) ──
-- Débito/conversión/join: callable por usuarios autenticados.
GRANT EXECUTE ON FUNCTION spend_protons(uuid, bigint, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_electrons_to_protons(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION join_challenge(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION economy_rank_from_lifetime(int) TO authenticated;

-- Crédito: SOLO service_role. Revocar de public/authenticated/anon (que heredan de public).
REVOKE ALL ON FUNCTION award_electrons(uuid, int, text, jsonb, text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION award_protons(uuid, bigint, text, text, jsonb) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION settle_challenge(uuid, uuid, boolean) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION award_electrons(uuid, int, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION award_protons(uuid, bigint, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION settle_challenge(uuid, uuid, boolean) TO service_role;
