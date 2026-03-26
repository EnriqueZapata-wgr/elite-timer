-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS day_description TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS timed_goals JSONB DEFAULT '[]';
