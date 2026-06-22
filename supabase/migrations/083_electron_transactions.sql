-- 083_electron_transactions.sql — Economía Protones H+ (Parte 1.2)
-- Log inmutable (append-only) de cada movimiento de Electrones. Idempotente. RLS.
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS electron_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INT NOT NULL,
  reason TEXT NOT NULL, -- 'habit_sleep', 'habit_steps', 'lab_upload', 'test_completed', 'reto_completed', 'conversion_to_proton', 'achievement', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_electron_tx_user_created ON electron_transactions(user_id, created_at DESC);

ALTER TABLE electron_transactions ENABLE ROW LEVEL SECURITY;

-- SEGURIDAD: log inmutable → el usuario solo LEE. Los inserts van por RPC DEFINER (091).
DROP POLICY IF EXISTS "User manages own electron tx" ON electron_transactions;
DROP POLICY IF EXISTS "User reads own electron tx" ON electron_transactions;
CREATE POLICY "User reads own electron tx" ON electron_transactions FOR SELECT USING (auth.uid() = user_id);
