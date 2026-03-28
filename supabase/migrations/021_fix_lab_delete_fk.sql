-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor

-- Problema: FK circulares entre lab_results y lab_uploads impiden DELETE.
-- Solución: Cambiar a ON DELETE SET NULL para que no bloqueen.

-- 1. lab_uploads.lab_result_id → SET NULL al borrar lab_result
ALTER TABLE lab_uploads DROP CONSTRAINT IF EXISTS lab_uploads_lab_result_id_fkey;
ALTER TABLE lab_uploads ADD CONSTRAINT lab_uploads_lab_result_id_fkey
  FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE SET NULL;

-- 2. lab_results.upload_id → SET NULL al borrar lab_upload
ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_upload_id_fkey;
ALTER TABLE lab_results ADD CONSTRAINT lab_results_upload_id_fkey
  FOREIGN KEY (upload_id) REFERENCES lab_uploads(id) ON DELETE SET NULL;

-- 3. consultations.lab_result_id → SET NULL al borrar lab_result
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_lab_result_id_fkey;
ALTER TABLE consultations ADD CONSTRAINT consultations_lab_result_id_fkey
  FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE SET NULL;
