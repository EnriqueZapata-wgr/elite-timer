-- ============================================================================
-- 153 — ONBOARDING V2 (F2 sprint UX blockers V1.3, rango Fable 150-199).
--
-- 1) client_profiles.cycle_modality — Modalidad de Ciclo (task #111):
--      mujer: regular (default) | pregnancy | menopause | no_cycle
--      hombre: partner (vinculado a pareja) | disabled (default)
--    Configurable en onboarding paso 4 + Settings de Ciclo.
--
-- 2) profiles.medical_consent_at — timestamp del consentimiento médico
--    (pantalla 6 del onboarding v2, disclaimers de Mariana).
--
-- Nota: el step del onboarding v2 REUTILIZA profiles.onboarding_step (TEXT
-- sin CHECK, migración 032) con valores 'v2_welcome' … 'v2_notifications' /
-- 'completed'. No requiere columna nueva.
--
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_profiles' AND column_name = 'cycle_modality'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN cycle_modality TEXT
      CHECK (cycle_modality IN ('regular', 'pregnancy', 'menopause', 'no_cycle', 'partner', 'disabled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'medical_consent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN medical_consent_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN client_profiles.cycle_modality IS
  'Modalidad del módulo Ciclo (task #111): regular/pregnancy/menopause/no_cycle (mujer), partner/disabled (hombre). NULL = no configurada (pre-v2).';
COMMENT ON COLUMN profiles.medical_consent_at IS
  'Momento en que el usuario aceptó los disclaimers médicos en onboarding v2.';
