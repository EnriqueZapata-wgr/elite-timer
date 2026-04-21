-- ============================================================
-- Migración 051: Onboarding v2 — campos adicionales para client_profiles
-- Soporta el nuevo flujo de 7 bloques con preguntas funcionales
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- Bloque 1: Goal
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS previous_attempts TEXT[];
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS motivation_level INTEGER;

-- Bloque 3: Health (functional flags)
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS detected_issues TEXT[];
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS functional_flags JSONB DEFAULT '{}';

-- Bloque 4: Nutrition
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS protein_sources TEXT[];
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS food_relationship TEXT;

-- Bloque 5: Context
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS sedentary_hours NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS equipment_access TEXT[];
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS time_available_min INTEGER;

-- Raw onboarding answers (all blocks as JSONB for analytics/ARGOS context)
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS onboarding_answers JSONB DEFAULT '{}';
