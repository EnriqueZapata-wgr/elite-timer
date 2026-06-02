-- Migration 069: Coach Engine Audit Refinement
-- Añade trazabilidad fina al log de auditoría (revisión post Step COACH 5+6).
-- Enrique ejecuta manualmente en Supabase SQL Editor.

BEGIN;

-- ========================================
-- 1. frenos_log: añadir intervention_log_id
-- ========================================
ALTER TABLE frenos_log
  ADD COLUMN IF NOT EXISTS intervention_log_id UUID REFERENCES intervention_logs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS frenos_log_intervention_log_id_idx
  ON frenos_log(intervention_log_id);

-- ========================================
-- 2. principle_invocations: añadir intervention_log_id + rationale
-- ========================================
ALTER TABLE principle_invocations
  ADD COLUMN IF NOT EXISTS intervention_log_id UUID REFERENCES intervention_logs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rationale TEXT;

CREATE INDEX IF NOT EXISTS principle_invocations_intervention_log_id_idx
  ON principle_invocations(intervention_log_id);

-- Si conversation_id existía como columna principal y va a desuso, NO la borres.
-- Queda como fallback / contexto adicional. El nuevo flujo prefiere intervention_log_id.

-- ========================================
-- 3. red_flag_events: añadir signal_description + last_recurrence_at
-- ========================================
ALTER TABLE red_flag_events
  ADD COLUMN IF NOT EXISTS signal_description TEXT,
  ADD COLUMN IF NOT EXISTS last_recurrence_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill: para filas existentes (si las hay), copiar evidence_text → signal_description
UPDATE red_flag_events
  SET signal_description = evidence_text
  WHERE signal_description IS NULL AND evidence_text IS NOT NULL;

-- last_recurrence_at: backfill con updated_at o created_at
UPDATE red_flag_events
  SET last_recurrence_at = COALESCE(updated_at, created_at, NOW())
  WHERE last_recurrence_at IS NULL;

COMMIT;
