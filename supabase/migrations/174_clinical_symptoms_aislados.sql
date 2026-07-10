-- ============================================================================
-- 174 — CLINICAL_SYMPTOMS_AISLADOS (síntomas aislados quick-tap). Rango Fable 150-199.
--
-- ⚠️ DESVIACIÓN DE LA DECISIÓN #3 (reusar clinical_symptoms con kind='aislado').
-- Auditoría previa detectó contraindicación GRANDE y se optó por tabla separada
-- (fallback pre-autorizado en la decisión #3):
--   · clinical_symptoms.system_key es NOT NULL y los agregadores
--     (groupSymptomsBySystem / buildExecutiveSummary), health-hub.tsx,
--     clinical-system.tsx y data-export-generator ASUMEN que cada fila es un
--     síntoma clasificado en uno de los 7 sistemas funcionales.
--   · Mezclar quick-taps peso BAJO sin sistema (a) rompería el NOT NULL / la UX
--     rápida y (b) inflaría el "mayor carga por sistema" del expediente ya en
--     producción, además de contaminar la exportación de privacidad.
-- Tabla separada = CERO impacto en clinical_symptoms y sus consumidores; el motor
-- DX lee ambas (sistema peso MEDIO · aislados peso BAJO). Trivialmente reversible.
--
-- Quick-tap: tag (chip o texto libre) + severidad OPCIONAL + timestamp.
-- Idempotente. RLS: dueño full + coach lectura.
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical_symptoms_aislados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  severity SMALLINT CHECK (severity BETWEEN 1 AND 5),  -- opcional
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_symptoms_aislados_user
  ON clinical_symptoms_aislados (user_id, logged_at DESC);

ALTER TABLE clinical_symptoms_aislados ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own aislados" ON clinical_symptoms_aislados
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client aislados" ON clinical_symptoms_aislados
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = clinical_symptoms_aislados.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
