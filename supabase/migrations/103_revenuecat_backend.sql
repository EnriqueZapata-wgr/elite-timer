-- Task #40 backend — RevenueCat wiring + Task #133 Pro Boost H+
-- Cowork range: 103. Aplicada en remoto 2026-07-07 vía MCP.

-- 1) subscription_events — audit trail de eventos RevenueCat webhook
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'INITIAL_PURCHASE', 'RENEWAL', 'CANCELLATION', 'UNCANCELLATION',
    'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_PAUSED', 'EXPIRATION',
    'BILLING_ISSUE', 'PRODUCT_CHANGE', 'TRANSFER', 'SUBSCRIBER_ALIAS',
    'TEMPORARY_ENTITLEMENT_GRANT', 'TEST'
  )),
  product_id TEXT NOT NULL,
  entitlement_id TEXT,
  tier TEXT,
  original_transaction_id TEXT,
  price_usd NUMERIC(10,2),
  currency TEXT,
  event_timestamp_ms BIGINT NOT NULL,
  expiration_at TIMESTAMPTZ,
  is_trial_conversion BOOLEAN DEFAULT false,
  store TEXT CHECK (store IN ('APP_STORE', 'PLAY_STORE', 'PROMOTIONAL', 'AMAZON', 'STRIPE')),
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_events_transaction ON subscription_events(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type, processed_at DESC);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sub_events_select" ON subscription_events;
CREATE POLICY "own_sub_events_select" ON subscription_events FOR SELECT USING (auth.uid() = user_id);

-- 2) profiles: agregar columnas tier
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'base', 'pro', 'clinician'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

-- 3) pro_boosts — Task #133 Boost Pro 24h para Base users con H+
CREATE TABLE IF NOT EXISTS pro_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cost_h_plus INTEGER NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  source TEXT NOT NULL DEFAULT 'h_plus_purchase' CHECK (source IN ('h_plus_purchase', 'promotional', 'admin_grant'))
);
CREATE INDEX IF NOT EXISTS idx_pro_boosts_user_expires ON pro_boosts(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_boosts_user_activated ON pro_boosts(user_id, activated_at DESC);

ALTER TABLE pro_boosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_boosts_select" ON pro_boosts;
CREATE POLICY "own_boosts_select" ON pro_boosts FOR SELECT USING (auth.uid() = user_id);

-- 4) Functions
CREATE OR REPLACE FUNCTION has_active_pro_boost(p_user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pro_boosts WHERE user_id = p_user_id AND expires_at > NOW()
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION activate_pro_boost(
  p_user_id UUID,
  p_cost_h_plus INTEGER DEFAULT 500,
  p_duration_hours INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  current_balance INTEGER;
  active_boosts_this_week INTEGER;
  new_expires_at TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO active_boosts_this_week
  FROM pro_boosts
  WHERE user_id = p_user_id AND activated_at > NOW() - INTERVAL '7 days';

  IF active_boosts_this_week >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limit_exceeded',
      'message', 'Máximo 3 boosts por semana. Considera ATP Pro para acceso ilimitado.');
  END IF;

  IF has_active_pro_boost(p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_active',
      'message', 'Ya tienes un boost activo.');
  END IF;

  SELECT COALESCE(balance, 0) INTO current_balance
  FROM proton_balance WHERE user_id = p_user_id;

  IF current_balance < p_cost_h_plus THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_h_plus',
      'required', p_cost_h_plus, 'current', current_balance);
  END IF;

  PERFORM spend_protons(p_user_id, p_cost_h_plus, 'pro_boost_24h',
    jsonb_build_object('duration_hours', p_duration_hours));

  new_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

  INSERT INTO pro_boosts (user_id, expires_at, cost_h_plus, duration_hours)
  VALUES (p_user_id, new_expires_at, p_cost_h_plus, p_duration_hours);

  RETURN jsonb_build_object('success', true, 'expires_at', new_expires_at,
    'h_plus_remaining', current_balance - p_cost_h_plus);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE subscription_events IS 'Task #40 — eventos RevenueCat webhook. Audit trail.';
COMMENT ON TABLE pro_boosts IS 'Task #133 — Boost Pro 24h para Base users con H+.';
COMMENT ON FUNCTION activate_pro_boost IS 'Activa boost Pro 24h descontando H+. Rate limit 3/semana.';
