-- ============================================================
-- Migración 032: Onboarding state en profiles
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step TEXT DEFAULT 'pending';
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Marcar usuarios existentes como completados para que no vean onboarding
UPDATE profiles SET onboarding_step = 'completed', onboarding_completed_at = NOW()
WHERE onboarding_step IS NULL OR onboarding_step = 'pending';
