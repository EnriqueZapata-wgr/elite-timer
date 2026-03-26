-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_highest_kg NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_highest_year TEXT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_lowest_kg NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_lowest_year TEXT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_ideal_kg NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS weight_ideal_notes TEXT;
