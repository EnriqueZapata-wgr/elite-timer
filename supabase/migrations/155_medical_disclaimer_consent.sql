-- ============================================================================
-- 155 — MEDICAL DISCLAIMER CONSENT (#42) — overnight sprint 2026-07-06.
-- Rango Fable 150-199.
--
-- Columnas en `user_consent` (tabla de la migración 100, Cowork):
--   medical_disclaimer_accepted_at — cuándo aceptó los disclaimers médicos
--   medical_disclaimer_version     — versión aceptada (bump semántico re-pide)
--
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_consent' AND column_name = 'medical_disclaimer_accepted_at'
  ) THEN
    ALTER TABLE user_consent ADD COLUMN medical_disclaimer_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_consent' AND column_name = 'medical_disclaimer_version'
  ) THEN
    ALTER TABLE user_consent ADD COLUMN medical_disclaimer_version TEXT;
  END IF;
END $$;

COMMENT ON COLUMN user_consent.medical_disclaimer_accepted_at IS
  'Cuándo el usuario aceptó los disclaimers médicos (#42). NULL = nunca aceptó → gate.';
COMMENT ON COLUMN user_consent.medical_disclaimer_version IS
  'Versión de disclaimers aceptada (MEDICAL_DISCLAIMER_VERSION). Bump → re-solicita.';
