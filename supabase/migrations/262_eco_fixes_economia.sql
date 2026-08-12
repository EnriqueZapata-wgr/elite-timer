-- 262_eco_fixes_economia.sql — Briefs ECO (R and D/reestructura/ECONOMIA_DIAGNOSTICO_Y_PLAN.md)
-- Caso Pato, 12-ago-2026. Idempotente. `npx supabase db push` post-merge,
-- ANTES de redeployar argos-proxy (el proxy trae fallback si aún no corre).
--
--   ECO-2 · consume_argos_usage: el contador diario SOLO cuenta acciones
--           servidas. increment_argos_usage (065) incrementaba también al
--           bloquear: quien insistió 200 veces compraba boost y seguía
--           bloqueado (200 > 150). Se conserva la función vieja para el
--           proxy desplegado hasta el redeploy.
--   ECO-6 · get_effective_tier(p_user_id): el MISMO árbitro que el cliente
--           (get_my_effective_tier) pero invocable por el proxy con
--           service_role. get_my_effective_tier pasa a delegar aquí —
--           un solo árbitro, dos entradas.
--   ECO-4 · activate_pro_boost v3: si el INSERT en pro_boosts falla después
--           de spend_protons, el débito se compensa con refund documentado
--           en el ledger (antes quedaba el cobro sin boost).
--   ECO-1 · guard server-side en activate_pro_boost: a tier efectivo
--           Pro/Clínico el boost no le da NADA (caso Pato: pagó 500 H+ por
--           nada) → 'tier_already_pro', sin cobro.

-- ── ECO-2 · consume_argos_usage ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_argos_usage(p_user_id uuid, p_limit int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
BEGIN
  -- Asegurar la fila del día (count 0) y tomar lock para decidir sin carrera.
  INSERT INTO argos_daily_usage (user_id, usage_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT message_count INTO v_count
  FROM argos_daily_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  IF v_count >= p_limit THEN
    -- Bloqueado SIN incrementar: el contador queda = acciones servidas.
    RETURN jsonb_build_object('blocked', true, 'count', v_count);
  END IF;

  UPDATE argos_daily_usage
  SET message_count = message_count + 1, updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  RETURNING message_count INTO v_count;

  RETURN jsonb_build_object('blocked', false, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION consume_argos_usage(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_argos_usage(uuid, int) TO service_role;

COMMENT ON FUNCTION consume_argos_usage(uuid, int) IS
  'ECO-2 — circuit breaker ARGOS: incrementa SOLO si count < limit (acciones servidas). Reemplaza a increment_argos_usage en el proxy.';

-- ── ECO-6 · get_effective_tier (árbitro único, entrada por user_id) ───────
CREATE OR REPLACE FUNCTION get_effective_tier(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved JSONB;
  v_profile RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;

  v_resolved := resolve_effective_tier(p_user_id);

  -- Transición (misma regla que get_my_effective_tier de 240): un tier
  -- vigente escrito directo en profiles (RevenueCat de hoy, altas manuales)
  -- manda si supera al resuelto. Honra tier_expires_at — un tier vencido
  -- NUNCA gana (el proxy antes lo ignoraba: ese era el bug).
  SELECT tier, tier_expires_at INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF FOUND AND v_profile.tier IS NOT NULL AND v_profile.tier <> 'free'
     AND (v_profile.tier_expires_at IS NULL OR v_profile.tier_expires_at > NOW())
     AND (CASE v_profile.tier WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
       > (CASE v_resolved->>'tier' WHEN 'clinician' THEN 3 WHEN 'pro' THEN 2 WHEN 'base' THEN 1 ELSE 0 END)
  THEN
    RETURN jsonb_build_object(
      'tier', v_profile.tier,
      'source', 'profile',
      'expires_at', v_profile.tier_expires_at
    );
  END IF;

  RETURN v_resolved;
END;
$$;

REVOKE ALL ON FUNCTION get_effective_tier(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_effective_tier(UUID) TO service_role;

COMMENT ON FUNCTION get_effective_tier(UUID) IS
  'ECO-6 — tier efectivo por user_id (tier_grants + profiles con expiry). Árbitro único: get_my_effective_tier delega aquí; el proxy lo consulta con service_role.';

-- get_my_effective_tier delega — misma semántica, cero duplicación.
CREATE OR REPLACE FUNCTION get_my_effective_tier()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('tier', 'free', 'source', NULL, 'expires_at', NULL);
  END IF;
  RETURN get_effective_tier(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION get_my_effective_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_effective_tier() TO authenticated, service_role;

COMMENT ON FUNCTION get_my_effective_tier() IS
  'MB-13 — consulta del cliente: tier efectivo del usuario autenticado. Desde 262 delega en get_effective_tier (ECO-6).';

-- ── ECO-4 + ECO-1 · activate_pro_boost v3 ─────────────────────────────────
CREATE OR REPLACE FUNCTION activate_pro_boost(
  p_user_id UUID,
  p_cost_h_plus INTEGER DEFAULT 500,
  p_duration_hours INTEGER DEFAULT 24
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  boosts_this_week INTEGER;
  spend_result JSONB;
  new_expires_at TIMESTAMPTZ;
  v_tier TEXT;
BEGIN
  -- Guard de identidad (mismo patrón que spend_protons 091/094)
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_cost_h_plus <= 0 OR p_duration_hours <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- ECO-1 (caso Pato): el boost eleva el tier efectivo a Pro — venderlo a
  -- Pro/Clínico es cobrar por nada. Guard server-side: ninguna UI (tienda,
  -- cards, bundles viejos sin OTA) puede volver a hacerlo.
  v_tier := COALESCE(get_effective_tier(p_user_id)->>'tier', 'free');
  IF v_tier IN ('pro', 'clinician') THEN
    RETURN jsonb_build_object('success', false, 'error', 'tier_already_pro',
      'message', 'Tu plan ya incluye el límite Pro completo. El boost no te daría nada extra.');
  END IF;

  -- Rate limit: máx 3 boosts por ventana rodante de 7 días
  SELECT COUNT(*) INTO boosts_this_week
  FROM pro_boosts
  WHERE user_id = p_user_id AND activated_at > NOW() - INTERVAL '7 days';

  IF boosts_this_week >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limit_exceeded',
      'message', 'Máximo 3 boosts por semana. Considera ATP Pro para acceso ilimitado.');
  END IF;

  IF has_active_pro_boost(p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_active',
      'message', 'Ya tienes un boost activo.');
  END IF;

  -- Débito atómico vía spend_protons (lock FOR UPDATE + anti-negativo).
  spend_result := spend_protons(p_user_id, p_cost_h_plus, 'pro_boost_24h',
    jsonb_build_object('duration_hours', p_duration_hours));

  IF NOT COALESCE((spend_result->>'success')::BOOLEAN, false) THEN
    IF spend_result->>'error' = 'insufficient_protons' THEN
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_h_plus',
        'required', p_cost_h_plus,
        'current', COALESCE((spend_result->>'new_balance')::BIGINT, 0));
    END IF;
    RETURN spend_result;
  END IF;

  new_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  -- ECO-4: el INSERT va en subtransacción. Si falla (RLS, constraint, lo que
  -- sea), el débito de arriba se COMPENSA con un refund documentado en el
  -- ledger y el cliente recibe error estructurado — nunca cobro sin boost.
  BEGIN
    INSERT INTO pro_boosts (user_id, expires_at, cost_h_plus, duration_hours)
    VALUES (p_user_id, new_expires_at, p_cost_h_plus, p_duration_hours);
  EXCEPTION WHEN OTHERS THEN
    PERFORM award_protons(p_user_id, p_cost_h_plus::BIGINT, 'refund', 'pro_boost_24h',
      jsonb_build_object('reason', 'boost_insert_failed', 'sqlstate', SQLSTATE));
    RETURN jsonb_build_object('success', false, 'error', 'boost_activation_failed',
      'message', 'No pudimos activar el boost. Tus H+ fueron devueltos.');
  END;

  RETURN jsonb_build_object('success', true, 'expires_at', new_expires_at,
    'h_plus_remaining', COALESCE((spend_result->>'new_balance')::BIGINT, 0));
END;
$$;

REVOKE ALL ON FUNCTION activate_pro_boost(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION activate_pro_boost(UUID, INTEGER, INTEGER) TO authenticated, service_role;

COMMENT ON FUNCTION activate_pro_boost IS
  'v3 (262): guard tier_already_pro (ECO-1, caso Pato) + refund si el INSERT del boost falla tras el débito (ECO-4). Débito vía spend_protons, rate limit 3/semana.';
