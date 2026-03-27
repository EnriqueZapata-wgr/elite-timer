-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

-- Agregar biomarcadores a body_measurements para que tengan historial
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS grip_strength_kg NUMERIC;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS blood_pressure_sys INT;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS blood_pressure_dia INT;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS vo2_max NUMERIC;
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS metabolic_age_impedance INT;
