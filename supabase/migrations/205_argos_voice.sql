-- ============================================================================
-- 205 — ARGOS VOICE (MB-10): preferencia de voz de ARGOS (masculina/femenina).
-- Se elige en Meet ARGOS (onboarding post-pago). NULL = aún no elegida.
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'argos_voice'
  ) THEN
    ALTER TABLE profiles ADD COLUMN argos_voice TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_argos_voice_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_argos_voice_check
      CHECK (argos_voice IS NULL OR argos_voice IN ('masculina', 'femenina'));
  END IF;
END $$;
