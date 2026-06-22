-- 082_electron_balance.sql — Economía Protones H+ (Parte 1.1)
-- Balance de Electrones (E-) por usuario: moneda de rank PERMANENTE (no transable).
-- Idempotente. RLS obligatoria. ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS electron_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_electrons INT NOT NULL DEFAULT 0 CHECK (current_electrons >= 0),
  lifetime_electrons INT NOT NULL DEFAULT 0 CHECK (lifetime_electrons >= 0),
  current_rank INT NOT NULL DEFAULT 1 CHECK (current_rank BETWEEN 1 AND 99),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE electron_balance ENABLE ROW LEVEL SECURITY;

-- SEGURIDAD: balance es moneda → el usuario solo LEE. Las mutaciones van por RPC
-- SECURITY DEFINER (migración 091). Un FOR ALL aquí permitiría que el cliente se
-- auto-acreditara electrones (exploit de minteo). Desviación vs handoff — ver COWORK_REPORT.
DROP POLICY IF EXISTS "User manages own electron balance" ON electron_balance;
DROP POLICY IF EXISTS "User reads own electron balance" ON electron_balance;
CREATE POLICY "User reads own electron balance" ON electron_balance FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coach reads client electron balance" ON electron_balance;
CREATE POLICY "Coach reads client electron balance" ON electron_balance FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.client_id = electron_balance.user_id AND cc.status = 'active')
);
