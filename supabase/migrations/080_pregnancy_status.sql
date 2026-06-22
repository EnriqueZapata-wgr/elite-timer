-- ============================================================================
-- 080 — PREGNANCY STATUS: máscara de embarazo en el ciclo (C3)
-- Columna JSONB en cycle_settings (creada en 034). Forma:
--   pregnancy_status = { "is_pregnant": true, "due_date": "2026-12-01", "start_date": "2026-06-19" }
-- Cuando is_pregnant=true, el calendario de ciclo cambia a modo embarazo (sin predicción de
-- menstruación; muestra semana gestacional + trimestre). El trimestre/semana se DERIVA en
-- cliente desde due_date (src/utils/pregnancy.ts), no se persiste (evita drift).
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente.
-- ============================================================================

ALTER TABLE cycle_settings
  ADD COLUMN IF NOT EXISTS pregnancy_status JSONB DEFAULT NULL;
