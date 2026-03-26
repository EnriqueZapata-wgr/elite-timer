-- ============================================================
-- Migración: Músculo kg, borrar consultas, referencia paciente
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS muscle_mass_kg NUMERIC;

-- Permitir borrar cualquier consulta (no solo drafts)
DROP POLICY IF EXISTS "Coach deletes own draft consultations" ON consultations;
CREATE POLICY "Coach deletes own consultations" ON consultations FOR DELETE USING (auth.uid() = coach_id);

-- Referencia del paciente
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS referral_detail TEXT;
