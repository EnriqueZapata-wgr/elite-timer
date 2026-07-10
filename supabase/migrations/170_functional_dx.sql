-- ============================================================================
-- 170 — MI DIAGNÓSTICO FUNCIONAL (DX vivo, versionado). Rango Fable 150-199.
--
-- Transformación DX + Intervenciones (mapa v1 · decisiones aprobadas 2026-07-11).
-- El DX es un documento VIVO y APPEND-ONLY: cada actualización inserta una fila
-- nueva; la anterior queda como respaldo (nunca se pierde una versión). Se marca
-- exactamente una versión vigente por usuario (is_current, índice parcial único).
--
-- Fuentes que lo alimentan (peso relativo, síntesis ARGOS): levantamientos
-- (historia_clinica), síntomas (clinical_symptoms + aislados), padecimientos,
-- labs (lab_values), Braverman, quizzes, hábitos, suplementos.
--
-- Niveles de calidad 1-5 (brief): 1 HC básica · 2 +integral · 3 +áreas+hábitos ·
-- 4 +labs · 5 +genéticos. Regla no-negociable "falta de data ≠ ausencia": se
-- modela con `confidence` por raíz dentro de roots_detected, nunca se afirma
-- ausencia por falta de dato.
--
-- Idempotente. RLS: dueño full + coach lectura (patrón 079/152).
-- ============================================================================

CREATE TABLE IF NOT EXISTS functional_dx (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL,
  quality_level SMALLINT NOT NULL DEFAULT 1 CHECK (quality_level BETWEEN 1 AND 5),
  -- roots_detected: [{ root_key, severity(1-5), confidence(0-1), sources[] }]
  roots_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_text TEXT,
  -- sources_snapshot: { levantamientos: {..fecha}, labs: {..fecha}, ... }
  -- Alimenta el "qué te falta" didáctico de la Card A.
  sources_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by TEXT NOT NULL DEFAULT 'system'
    CHECK (generated_by IN ('argos_auto', 'manual', 'system')),
  model TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, version)
);

-- Exactamente una versión vigente por usuario (el motor baja el flag anterior
-- en la misma transacción al insertar una nueva).
CREATE UNIQUE INDEX IF NOT EXISTS idx_functional_dx_current
  ON functional_dx (user_id) WHERE is_current;

CREATE INDEX IF NOT EXISTS idx_functional_dx_user_version
  ON functional_dx (user_id, version DESC);

ALTER TABLE functional_dx ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own functional dx" ON functional_dx
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client functional dx" ON functional_dx
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = functional_dx.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
