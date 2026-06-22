-- 084_proton_balance.sql — Economía Protones H+ (Parte 1.3)
-- Balance de Protones (H+): moneda TRANSABLE (gastable en acciones IA / retos).
-- BIGINT porque los montos son grandes (1 H+ = $0.001 MXN). Idempotente. RLS.
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS proton_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_protons BIGINT NOT NULL DEFAULT 0 CHECK (current_protons >= 0),
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_spent BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proton_balance ENABLE ROW LEVEL SECURITY;

-- SEGURIDAD: H+ es moneda transable → el usuario solo LEE. Mutaciones por RPC DEFINER (091).
-- Un FOR ALL permitiría auto-mintear H+ (exploit crítico). Desviación vs handoff — COWORK_REPORT.
DROP POLICY IF EXISTS "User manages own proton balance" ON proton_balance;
DROP POLICY IF EXISTS "User reads own proton balance" ON proton_balance;
CREATE POLICY "User reads own proton balance" ON proton_balance FOR SELECT USING (auth.uid() = user_id);
