-- ============================================================================
-- 154 — AGE GATE (#41, compliance stores) — overnight sprint 2026-07-06.
-- Rango Fable 150-199.
--
-- Columnas en `profiles` (el spec dice user_profiles, pero esa tabla no
-- existe: el perfil auth-linked es `profiles`, igual que medical_consent_at
-- en la 153):
--   age_verified_at        — cuándo pasó el gate (≥18 o parental confirmado)
--   parental_consent_email — email padre/madre (solo 13-17)
--   parental_consent_at    — cuándo confirmó consentimiento parental
--
-- Todas nullable, sin default (backward compat con usuarios existentes).
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'age_verified_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN age_verified_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'parental_consent_email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN parental_consent_email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'parental_consent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN parental_consent_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN profiles.age_verified_at IS
  'Age gate (#41): cuándo el usuario pasó la verificación de edad (≥18 directo, 13-17 con consentimiento parental).';
COMMENT ON COLUMN profiles.parental_consent_email IS
  'Email del padre/madre que dio consentimiento (usuarios 13-17).';
COMMENT ON COLUMN profiles.parental_consent_at IS
  'Cuándo se confirmó el consentimiento parental (usuarios 13-17).';
