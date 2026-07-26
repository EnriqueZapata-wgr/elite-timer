-- 231_exercise_logs_metadata.sql · MB-5 Bloque 0.1 (P0)
--
-- El código escribe exercise_logs.metadata en 5 call sites (log-exercise.tsx
-- ×4, workout-session-service.ts) pero la columna nunca existió en el remoto:
-- "Could not find the 'metadata' column of 'exercise_logs' in the schema
-- cache" → el insert de la sesión falla y el entrenamiento se pierde.
-- Verificado contra information_schema del remoto 2026-07-26.
--
-- Idempotente. Tabla existente con RLS ya habilitada — sin policies nuevas.

ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.exercise_logs.metadata IS
  'Contexto del set (método ATP, deuda EMOM, slot, isometría, distance_cm de benchmarks). JSON libre por diseño.';
