-- ============================================================================
-- 204 — KETONES SOURCES (#113, MB-8): cetonas de 3 fuentes de medición.
-- Antes solo sangre (mmol/L). Ahora sangre (mmol/L) · aliento (acetona ppm) ·
-- orina (nivel cualitativo de tira). value_mmol pasa a nullable porque orina y
-- aliento no lo usan. Filas existentes → source='blood' (default), sin pérdida.
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente.
-- ============================================================================

ALTER TABLE ketones_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'blood';

ALTER TABLE ketones_logs
  ADD COLUMN IF NOT EXISTS value_ppm NUMERIC(5,1);      -- aliento: acetona ppm

ALTER TABLE ketones_logs
  ADD COLUMN IF NOT EXISTS urine_level TEXT;            -- orina: negative..large

-- value_mmol ya no es obligatorio (orina/aliento no lo llenan).
ALTER TABLE ketones_logs ALTER COLUMN value_mmol DROP NOT NULL;

-- CHECKs idempotentes (se recrean solo si no existen).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ketones_source_check') THEN
    ALTER TABLE ketones_logs ADD CONSTRAINT ketones_source_check
      CHECK (source IN ('blood', 'breath', 'urine'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ketones_urine_level_check') THEN
    ALTER TABLE ketones_logs ADD CONSTRAINT ketones_urine_level_check
      CHECK (urine_level IS NULL OR urine_level IN ('negative', 'trace', 'small', 'moderate', 'large'));
  END IF;
END $$;
