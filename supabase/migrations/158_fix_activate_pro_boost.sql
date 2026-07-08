-- 158_fix_activate_pro_boost.sql — Fix del RPC activate_pro_boost (103)
-- Rango Fable: 158-199. Sprint REVENUECAT+IAP+BOOST 2026-07-07.
--
-- Bugs de la versión 103 (Cowork):
--   1. Leía proton_balance.balance — la columna real es current_protons (084).
--      El RPC lanzaba "column balance does not exist" en runtime.
--   2. SECURITY INVOKER + pro_boosts solo tiene policy SELECT → el INSERT
--      del boost fallaba por RLS para cualquier caller authenticated.
--   3. Sin guard de identidad: cualquier usuario podía activar (y cobrar)
--      boosts sobre el user_id de otro.
--   4. Race: leía balance y luego llamaba spend_protons — el débito atómico
--      ya vive en spend_protons (094, SECURITY DEFINER + lock + idempotencia),
--      así que delegamos y usamos su resultado como compuerta.

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
BEGIN
  -- Guard de identidad (mismo patrón que spend_protons 091/094)
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_cost_h_plus <= 0 OR p_duration_hours <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
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
  -- Su resultado es la compuerta: sin débito exitoso no hay boost.
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

  INSERT INTO pro_boosts (user_id, expires_at, cost_h_plus, duration_hours)
  VALUES (p_user_id, new_expires_at, p_cost_h_plus, p_duration_hours);

  RETURN jsonb_build_object('success', true, 'expires_at', new_expires_at,
    'h_plus_remaining', COALESCE((spend_result->>'new_balance')::BIGINT, 0));
END;
$$;

COMMENT ON FUNCTION activate_pro_boost IS
  'Activa boost Pro 24h descontando H+ vía spend_protons. Rate limit 3/semana. Fix de 103 (columna + RLS + guard).';
