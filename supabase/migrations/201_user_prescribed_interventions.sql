-- 201: Motor de personalización — prescripciones versionadas (arquitectura v1 §7).
-- user_prescribed_interventions: cada corrida del motor escribe el top 5 con
-- rationale determinístico; las versiones anteriores se marcan superseded_at.
-- Vista user_current_prescription = la prescripción vigente (superseded_at IS NULL).
-- Idempotente: IF NOT EXISTS / OR REPLACE / duplicate_object atrapado.

CREATE TABLE IF NOT EXISTS user_prescribed_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_key VARCHAR(100) NOT NULL, -- FK conceptual a interventions-catalog.ts
  rank INTEGER NOT NULL, -- 1-5
  score INTEGER NOT NULL, -- 0-100
  is_universal_p1 BOOLEAN NOT NULL DEFAULT false,
  rationale JSONB NOT NULL, -- { summary, reasons[], epigeneticImpact }
  cycle_phase_note TEXT NULL,
  context_note TEXT NULL, -- warning 9+ activas (doctrina Humby) u otras notas del motor
  contraindication_checked TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier1 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier2 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_biomarkers_tier3 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Versión + timestamps
  phenotype_snapshot_hash VARCHAR(64) NOT NULL, -- hash del UserPhenotype al momento
  prescribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at TIMESTAMPTZ NULL, -- el recálculo marca la versión anterior

  CONSTRAINT rank_range CHECK (rank BETWEEN 1 AND 5),
  CONSTRAINT score_range CHECK (score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_user_prescribed_current
  ON user_prescribed_interventions(user_id, prescribed_at DESC)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_prescribed_history
  ON user_prescribed_interventions(user_id, prescribed_at DESC);

ALTER TABLE user_prescribed_interventions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY user_prescribed_own_data ON user_prescribed_interventions
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vista "prescripción vigente" (Mi Protocolo + motor). security_invoker: la RLS
-- de la tabla base gobierna — sin esto la vista corre como owner y fuga filas.
CREATE OR REPLACE VIEW user_current_prescription
WITH (security_invoker = true) AS
SELECT *
FROM user_prescribed_interventions
WHERE superseded_at IS NULL
ORDER BY user_id, rank;
