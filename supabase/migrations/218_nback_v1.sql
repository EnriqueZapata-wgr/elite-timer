-- ============================================================================
-- 218 — N-BACK v1 (build del módulo sobre la mig 197).
--
-- 1) nback_sessions.date: fecha LOCAL del round (la escribe el cliente con
--    getLocalToday — mismo patrón que electron_logs/mind_sessions; regla #3).
-- 2) nback_user_state.challenge_started_on: arranque del reto de 20 días.
-- 3) claim_nback_protons(p_date): H+ de la decisión #44-5, SERVER-derivado
--    (el cliente no elige montos) + idempotente vía proton_transactions.
--    idempotency_key (índice único parcial de la mig 094). Crédito H+ sigue
--    siendo server-side: award_protons (091) queda intacto/service_role; esta
--    función deriva TODO de las tablas nback_* del propio auth.uid().
--    Montos (#44-5): +5 sesión diaria completa (12 rounds) · +50 nuevo PR de
--    N (una vez por valor, best_n ≥ 3; el default 2 no es PR) · +100 racha 7
--    · +500 racha 30 (keys con fecha → una corrida nueva sí re-otorga).
-- 4) nback_percentiles(): percentiles del caller vs todos (SECURITY DEFINER,
--    devuelve SOLO agregados — cero filas cross-user, consistente con la
--    doctrina de privacidad cognitiva de la mig 197; el leaderboard por
--    opt-in queda para Comunidad, aquí NO se construye).
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — db push tras merge.
-- ============================================================================

ALTER TABLE nback_sessions ADD COLUMN IF NOT EXISTS date DATE;

CREATE INDEX IF NOT EXISTS idx_nback_sessions_user_date
  ON nback_sessions (user_id, date);

ALTER TABLE nback_user_state ADD COLUMN IF NOT EXISTS challenge_started_on DATE;

-- ── Helper interno: crédito H+ idempotente (no callable por clientes) ──
CREATE OR REPLACE FUNCTION _nback_award_protons(
  p_user uuid, p_amount bigint, p_action_key text, p_idem text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted int;
BEGIN
  -- La INSERCIÓN es la compuerta atómica (patrón 092/094): balance solo si
  -- la tx entró de verdad.
  INSERT INTO proton_transactions (user_id, amount, type, action_key, metadata, idempotency_key)
  VALUES (p_user, p_amount, 'achievement_bonus', p_action_key,
          jsonb_build_object('module', 'nback'), p_idem)
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN false; END IF;

  INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, updated_at)
  VALUES (p_user, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_protons = proton_balance.current_protons + p_amount,
    lifetime_earned = proton_balance.lifetime_earned + p_amount,
    updated_at = now();
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION _nback_award_protons(uuid, bigint, text, text) FROM PUBLIC, authenticated, anon;

-- ── Claim de H+ N-Back (authenticated; todo derivado server-side) ──
CREATE OR REPLACE FUNCTION claim_nback_protons(p_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_rounds int;
  v_state nback_user_state%ROWTYPE;
  v_awarded jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;
  -- p_date es el día LOCAL del cliente (patrón trigger 213): tolerancia ±1 día
  -- de UTC para husos, nada más lejos.
  IF p_date IS NULL OR p_date > (now()::date + 1) OR p_date < (now()::date - 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_date');
  END IF;

  SELECT count(*) INTO v_rounds FROM nback_sessions
    WHERE user_id = v_user AND date = p_date AND completed_at IS NOT NULL;
  SELECT * INTO v_state FROM nback_user_state WHERE user_id = v_user;
  IF v_state.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_state');
  END IF;

  -- +5 · sesión diaria completa (12 rounds del día local).
  IF v_rounds >= 12 THEN
    IF _nback_award_protons(v_user, 5, 'nback_daily',
         'nback_day:' || v_user || ':' || p_date) THEN
      v_awarded := v_awarded || jsonb_build_array(jsonb_build_object('kind', 'daily', 'amount', 5));
    END IF;
  END IF;

  -- +50 · nuevo personal record de N (una sola vez por cada valor de best_n).
  IF v_state.best_n >= 3 THEN
    IF _nback_award_protons(v_user, 50, 'nback_pr',
         'nback_pr:' || v_user || ':' || v_state.best_n) THEN
      v_awarded := v_awarded || jsonb_build_array(jsonb_build_object('kind', 'pr', 'amount', 50, 'n', v_state.best_n));
    END IF;
  END IF;

  -- +100 · racha de 7 días (el día exacto en que la racha llega a 7).
  IF v_state.streak_days = 7 THEN
    IF _nback_award_protons(v_user, 100, 'nback_streak_7',
         'nback_streak7:' || v_user || ':' || p_date) THEN
      v_awarded := v_awarded || jsonb_build_array(jsonb_build_object('kind', 'streak7', 'amount', 100));
    END IF;
  END IF;

  -- +500 · racha de 30 días.
  IF v_state.streak_days = 30 THEN
    IF _nback_award_protons(v_user, 500, 'nback_streak_30',
         'nback_streak30:' || v_user || ':' || p_date) THEN
      v_awarded := v_awarded || jsonb_build_array(jsonb_build_object('kind', 'streak30', 'amount', 500));
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'awarded', v_awarded);
END; $$;

REVOKE ALL ON FUNCTION claim_nback_protons(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_nback_protons(date) TO authenticated;

-- ── Percentiles del caller vs todos (agregados-only, cero filas ajenas) ──
CREATE OR REPLACE FUNCTION nback_percentiles()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state nback_user_state%ROWTYPE;
  v_total bigint;
  v_sessions_pct int;
  v_streak_pct int;
  v_best_pct int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;
  SELECT * INTO v_state FROM nback_user_state WHERE user_id = v_user;
  IF v_state.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_state');
  END IF;

  SELECT count(*) INTO v_total FROM nback_user_state;
  -- Percentil = % de usuarios con valor ≤ el mío (redondeado). Con 1 usuario
  -- será 100 — honesto para el arranque.
  SELECT round(100.0 * count(*) FILTER (WHERE sessions_total <= v_state.sessions_total) / GREATEST(v_total, 1))::int
    INTO v_sessions_pct FROM nback_user_state;
  SELECT round(100.0 * count(*) FILTER (WHERE streak_days <= v_state.streak_days) / GREATEST(v_total, 1))::int
    INTO v_streak_pct FROM nback_user_state;
  SELECT round(100.0 * count(*) FILTER (WHERE best_n <= v_state.best_n) / GREATEST(v_total, 1))::int
    INTO v_best_pct FROM nback_user_state;

  RETURN jsonb_build_object(
    'success', true,
    'users', v_total,
    'sessions_pct', v_sessions_pct,
    'streak_pct', v_streak_pct,
    'best_n_pct', v_best_pct
  );
END; $$;

REVOKE ALL ON FUNCTION nback_percentiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION nback_percentiles() TO authenticated;
