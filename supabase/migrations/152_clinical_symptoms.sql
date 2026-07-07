-- ============================================================================
-- 152 — HISTORIA CLÍNICA VIVA: síntomas por sistema funcional (F3 sprint
-- UX blockers V1.3, rango Fable 150-199).
--
-- `clinical_symptoms`: un síntoma activo/resuelto por fila, agrupado en los
-- 7 sistemas funcionales (matriz de medicina funcional / framework Mariana).
-- `clinical_symptom_logs`: timeline de severidad por síntoma (drill-down).
--
-- Idempotente. RLS: dueño full + coach lectura (patrón 079_historia_clinica).
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_key TEXT NOT NULL CHECK (system_key IN (
    'asimilacion','defensa','energia','biotransformacion',
    'transporte','comunicacion','estructura'
  )),
  name TEXT NOT NULL,
  severity INT NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved')),
  first_seen DATE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_symptoms_user_system
  ON clinical_symptoms (user_id, system_key, status);

ALTER TABLE clinical_symptoms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own clinical symptoms" ON clinical_symptoms
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client clinical symptoms" ON clinical_symptoms
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = clinical_symptoms.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Timeline de severidad ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinical_symptom_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id UUID NOT NULL REFERENCES clinical_symptoms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_symptom_logs_symptom
  ON clinical_symptom_logs (symptom_id, logged_at DESC);

ALTER TABLE clinical_symptom_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own symptom logs" ON clinical_symptom_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client symptom logs" ON clinical_symptom_logs
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = clinical_symptom_logs.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
