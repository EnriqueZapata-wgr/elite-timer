-- 089_challenges.sql — Economía Protones H+ (Parte 1.8)
-- Retos (challenges): catálogo legible por todos. Idempotente. RLS (read-all).
-- ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('habits', 'fitness', 'mind', 'labs', 'community')),
  entry_cost_protons INT NOT NULL CHECK (entry_cost_protons >= 0),
  prize_protons INT NOT NULL,
  criteria JSONB NOT NULL, -- ej. {"type": "daily_steps", "target": 20000, "days_required": 21}
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  electron_multiplier NUMERIC(3,2) DEFAULT 1.0, -- campaña: x2.0 durante el reto
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users read challenges" ON challenges;
CREATE POLICY "All users read challenges" ON challenges FOR SELECT USING (true);
