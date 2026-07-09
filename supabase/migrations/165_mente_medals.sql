-- 165_mente_medals.sql — Medallas del pilar MENTE (Sprint MENTE Ecosystem T5)
-- Rango Fable: 158-199.
--
-- Medallas por racha en cada categoría del pilar (journal / breathing /
-- meditation / checkin) a los 7 · 30 · 90 · 365 días consecutivos.
-- El cálculo de la racha vive en cliente (mente-streaks-service); esta tabla
-- persiste el logro (idempotente vía UNIQUE + ON CONFLICT en el service).

CREATE TABLE IF NOT EXISTS mente_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('journal', 'breathing', 'meditation', 'checkin')),
  tier TEXT NOT NULL CHECK (tier IN ('7d', '30d', '90d', '365d')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, tier)
);

ALTER TABLE mente_medals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_mente_medals" ON mente_medals;
CREATE POLICY "own_mente_medals" ON mente_medals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mente_medals_user ON mente_medals(user_id);
