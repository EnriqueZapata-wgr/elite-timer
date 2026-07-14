-- ============================================================================
-- 196 — Cache de "¿Por qué estas intervenciones?" (Megabuzón 2da pasada B.4).
--
-- Narrativa ARGOS (requestType 'intervention_rationale', seed 280 H+ en 175)
-- encima del match determinístico DX↔intervenciones. Cache por set_hash:
-- FNV-1a de (functional_dx.id vigente + set ordenado de intervention_keys
-- activas). Mismo DX + mismo protocolo → releer gratis; cambia el set o se
-- regenera el DX → hash nuevo → nueva generación (nuevo cobro, salvo Pro).
--
-- Patrón: braverman_premium_reports (160). El cliente inserta su propio cache
-- (RLS own-row). UNIQUE (user_id, set_hash) → el upsert del cliente es
-- race-safe ante doble request.
--
-- Idempotente. ⚠️ NO aplicar al remoto desde la rama — Enrique corre
-- `npx supabase db push` tras merge + audit Cowork (regla #12).
-- ============================================================================

CREATE TABLE IF NOT EXISTS intervention_rationales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- SET NULL (no CASCADE): si el DX viejo se purgara, la narrativa comprada
  -- sigue siendo del user; el hash ya no matcheará y simplemente regenerará.
  source_dx_id UUID REFERENCES functional_dx(id) ON DELETE SET NULL,
  set_hash TEXT NOT NULL,
  rationale_markdown TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, set_hash)
);

CREATE INDEX IF NOT EXISTS idx_intervention_rationales_user
  ON intervention_rationales(user_id, created_at DESC);

ALTER TABLE intervention_rationales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_intervention_rationale_select" ON intervention_rationales;
CREATE POLICY "own_intervention_rationale_select" ON intervention_rationales
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_intervention_rationale_insert" ON intervention_rationales;
CREATE POLICY "own_intervention_rationale_insert" ON intervention_rationales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE intervention_rationales IS
  'B.4 — Narrativa ARGOS "por qué estas intervenciones". Cache por (user, set_hash).';
