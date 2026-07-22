-- 208: trazabilidad del cerebro ARGOS servido (store central, tabla argos_brain).
-- El proxy loguea qué versión del cerebro respondió cada request cuando
-- BRAIN_ENABLED está activo (NULL = ruta legacy / flag off / caller no-chat).
-- Idempotente.
ALTER TABLE argos_logs ADD COLUMN IF NOT EXISTS brain_version text;
