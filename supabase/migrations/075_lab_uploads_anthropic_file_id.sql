-- 075_lab_uploads_anthropic_file_id.sql
-- Capa 5 (Files API): cachea el file_id que devuelve Anthropic al subir el PDF una sola vez,
-- para reusarlo en reintentos sin re-subir el archivo (menos latencia/bandwidth).
--
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE. Enrique la corre manual en Supabase SQL Editor
--    (regla #12 del CLAUDE.md). Idempotente. Mientras no se corra, el flujo cae a base64
--    inline (comportamiento actual) sin romper nada — el código tiene fallback transparente.

ALTER TABLE lab_uploads
  ADD COLUMN IF NOT EXISTS anthropic_file_id TEXT;
