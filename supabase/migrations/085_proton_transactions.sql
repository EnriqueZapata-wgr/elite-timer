-- 085_proton_transactions.sql — Economía Protones H+ (Parte 1.4)
-- Log inmutable de movimientos H+. amount: positivo=ganado, negativo=gastado.
-- Idempotente. RLS. ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS proton_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount BIGINT NOT NULL, -- positivo: ganado, negativo: gastado
  type TEXT NOT NULL CHECK (type IN ('subscription_bonus', 'package_purchase', 'conversion_from_electron', 'action_spent', 'reto_entry', 'reto_prize', 'referral_bonus', 'achievement_bonus', 'refund')),
  action_key TEXT, -- ej. 'chat', 'lab_interpretation' cuando type='action_spent'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proton_tx_user_created ON proton_transactions(user_id, created_at DESC);

ALTER TABLE proton_transactions ENABLE ROW LEVEL SECURITY;

-- SEGURIDAD: log inmutable → el usuario solo LEE. Los inserts van por RPC DEFINER (091).
DROP POLICY IF EXISTS "User manages own proton tx" ON proton_transactions;
DROP POLICY IF EXISTS "User reads own proton tx" ON proton_transactions;
CREATE POLICY "User reads own proton tx" ON proton_transactions FOR SELECT USING (auth.uid() = user_id);
