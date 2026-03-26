-- ============================================================
-- Migración: Agua corporal + biomarcadores físicos
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS body_water_pct NUMERIC;

ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS grip_strength_kg NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS blood_pressure_sys INT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS blood_pressure_dia INT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS vo2_max NUMERIC;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS metabolic_age_impedance INT;
