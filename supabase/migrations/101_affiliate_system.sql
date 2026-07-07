-- Task #47 fase 1 backend — Sistema afiliados UNIFICADO
-- Cowork range: 101 (100-149 reservado para Cowork)
-- Aplicada en remoto Supabase 2026-07-06 vía MCP execute_sql
-- Cubre: clínicos Fx + centros deportivos + coaches + influencers + retiros + educadores

-- 1) affiliates — perfil unificado del afiliado
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vertical TEXT NOT NULL CHECK (vertical IN ('clinico_fx', 'centro_deportivo', 'coach', 'influencer', 'retiro', 'educador', 'otro')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  cedula_profesional TEXT,
  rfc TEXT,
  business_name TEXT,
  short_bio TEXT,
  profile_photo_url TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  contract_signed_at TIMESTAMPTZ,
  contract_version TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_vertical_status ON affiliates(vertical, status);
CREATE INDEX IF NOT EXISTS idx_affiliates_pending_review ON affiliates(created_at DESC) WHERE status = 'pending';

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_affiliate_select" ON affiliates;
CREATE POLICY "own_affiliate_select" ON affiliates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_affiliate_insert" ON affiliates;
CREATE POLICY "own_affiliate_insert" ON affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_affiliate_update" ON affiliates;
CREATE POLICY "own_affiliate_update" ON affiliates FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 2) affiliate_codes
CREATE TABLE IF NOT EXISTS affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  campaign_tag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  clicks_count INT NOT NULL DEFAULT 0,
  signups_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_affiliate ON affiliate_codes(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code_active ON affiliate_codes(code) WHERE active = true;

ALTER TABLE affiliate_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_codes_select" ON affiliate_codes;
CREATE POLICY "own_codes_select" ON affiliate_codes FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "own_codes_insert" ON affiliate_codes;
CREATE POLICY "own_codes_insert" ON affiliate_codes FOR INSERT WITH CHECK (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "public_codes_lookup" ON affiliate_codes;
CREATE POLICY "public_codes_lookup" ON affiliate_codes FOR SELECT USING (active = true);

-- 3) affiliate_referred_users
CREATE TABLE IF NOT EXISTS affiliate_referred_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used TEXT REFERENCES affiliate_codes(code) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_paid_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  churned_at TIMESTAMPTZ,
  ltv_generated_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_affiliate_referred_affiliate ON affiliate_referred_users(affiliate_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_referred_active ON affiliate_referred_users(affiliate_id) WHERE active = true;

ALTER TABLE affiliate_referred_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_referred_select" ON affiliate_referred_users;
CREATE POLICY "own_referred_select" ON affiliate_referred_users FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  OR referred_user_id = auth.uid()
);

-- 4) affiliate_earnings
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  commission_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL CHECK (source_type IN ('referral_monthly', 'upsell_percent', 'clinic_fee', 'bonus', 'adjustment')),
  active_referrals_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready_for_payout', 'paid', 'held')),
  paid_at TIMESTAMPTZ,
  payout_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (affiliate_id, month_start, source_type)
);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate ON affiliate_earnings(affiliate_id, month_start DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_ready_payout ON affiliate_earnings(month_start) WHERE status = 'ready_for_payout';

ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_earnings_select" ON affiliate_earnings;
CREATE POLICY "own_earnings_select" ON affiliate_earnings FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- 5) affiliate_wallets
CREATE TABLE IF NOT EXISTS affiliate_wallets (
  affiliate_id UUID PRIMARY KEY REFERENCES affiliates(id) ON DELETE CASCADE,
  balance_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  lifetime_earned_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  lifetime_paid_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  payout_method TEXT,
  payout_details_encrypted TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE affiliate_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_wallet_select" ON affiliate_wallets;
CREATE POLICY "own_wallet_select" ON affiliate_wallets FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "own_wallet_update" ON affiliate_wallets;
CREATE POLICY "own_wallet_update" ON affiliate_wallets FOR UPDATE USING (
  affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- Trigger touch
CREATE OR REPLACE FUNCTION touch_affiliate_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliates_touch ON affiliates;
CREATE TRIGGER trg_affiliates_touch BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION touch_affiliate_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_touch ON affiliate_wallets;
CREATE TRIGGER trg_wallets_touch BEFORE UPDATE ON affiliate_wallets
  FOR EACH ROW EXECUTE FUNCTION touch_affiliate_updated_at();

-- Auto-crear wallet en approval
CREATE OR REPLACE FUNCTION affiliate_status_change_wallet_bootstrap() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO affiliate_wallets (affiliate_id) VALUES (NEW.id)
    ON CONFLICT (affiliate_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliate_bootstrap_wallet ON affiliates;
CREATE TRIGGER trg_affiliate_bootstrap_wallet AFTER UPDATE OF status ON affiliates
  FOR EACH ROW EXECUTE FUNCTION affiliate_status_change_wallet_bootstrap();

-- Helper: generar código único (ATP-XXXXXX)
CREATE OR REPLACE FUNCTION generate_affiliate_code() RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    new_code := 'ATP-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM affiliate_codes WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'No se pudo generar código único después de 10 intentos';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE affiliates IS 'Sistema afiliados unificado (Clínicos Fx + Centros + Coaches + Influencers + Retiros + Educadores)';
COMMENT ON TABLE affiliate_codes IS 'Códigos únicos de referido (múltiples por afiliado para tracking campañas)';
COMMENT ON TABLE affiliate_referred_users IS 'Un user pertenece SOLO a UN afiliado (primer código gana). LTV tracking.';
COMMENT ON TABLE affiliate_earnings IS 'Comisiones mensuales del afiliado por source_type. Idempotent';
COMMENT ON TABLE affiliate_wallets IS 'Balance transaccional del afiliado. Auto-creado al approval.';
