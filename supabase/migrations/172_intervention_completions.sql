-- ============================================================================
-- 172 — INTERVENTION_COMPLETIONS (log diario de compleción). Rango Fable 150-199.
-- Depende de 171.
--
-- Una fila por (intervención del user, día). Alimenta HOY (check del día) y la
-- progresión/adherencia futura. Al completar, el cliente además otorga electrón
-- vía awardBooleanElectron (reuso de la economía existente — NO se toca el ledger
-- aquí). user_id denormalizado para RLS directa del dueño.
--
-- Idempotente. RLS: dueño full (user_id) + coach lectura (vía padre).
-- ============================================================================

CREATE TABLE IF NOT EXISTS intervention_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_intervention_id UUID NOT NULL REFERENCES user_interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_intervention_id, date)
);

CREATE INDEX IF NOT EXISTS idx_intervention_completions_user_date
  ON intervention_completions (user_id, date DESC);

ALTER TABLE intervention_completions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own intervention completions" ON intervention_completions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client intervention completions" ON intervention_completions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = intervention_completions.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
