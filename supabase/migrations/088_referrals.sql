-- 088_referrals.sql — Economía Protones H+ (Parte 1.7)
-- Sistema de referidos: código único por referrer, tracking de estado. Idempotente. RLS.
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'paid', 'rewarded', 'cancelled')),
  signed_up_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  reward_protons INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own referrals" ON referrals;
CREATE POLICY "User reads own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- El referrer crea/gestiona su propio código (insert/update de sus filas).
DROP POLICY IF EXISTS "User manages own referral code" ON referrals;
CREATE POLICY "User manages own referral code" ON referrals FOR ALL USING (auth.uid() = referrer_id);
