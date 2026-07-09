-- 163_argos_introduced.sql — Flag primera intro de ARGOS (Fable Sprint MAGIA ARGOS)
-- Rango Fable 158-199.
--
-- profiles.argos_introduced_at marca cuándo el usuario vio la pantalla
-- "Meet ARGOS" (primer contacto post-onboarding, T6). Hasta que existe, el
-- floating button de ARGOS permanece oculto (ver argos-floating-core).
--
-- Idempotente (IF NOT EXISTS). NULL = aún no presentado.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'argos_introduced_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN argos_introduced_at TIMESTAMPTZ;
  END IF;
END $$;

-- Backfill: usuarios que YA terminaron el onboarding (antes de que Meet ARGOS
-- existiera) no pasarán por la cinemática, pero deben tener acceso al floating
-- button. Se les marca como presentados. Idempotente (solo toca NULLs).
UPDATE profiles
SET argos_introduced_at = NOW()
WHERE argos_introduced_at IS NULL
  AND onboarding_step = 'completed';
