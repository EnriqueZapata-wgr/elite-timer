-- ============================================================================
-- 185 — DX F4 (swap HOY/AGENDA): agenda_events aprende de intervenciones.
--
-- Las intervenciones activas ("Mi Protocolo") se vuelcan al MISMO pipeline de
-- agenda (agenda_events + agenda_event_logs, migración 098) con
-- source = 'intervention'. La columna `source` es TEXT SIN CHECK constraint
-- (098) → el valor nuevo NO requiere ALTER de enum/constraint.
--
-- `intervention_key`: referencia al catálogo (user_interventions.intervention_key)
-- para que la compleción del evento corra logCompletion (electrón + emits) y la
-- reconciliación (syncInterventionEvents) sea idempotente por key. NULL en todos
-- los eventos no-intervención (manual/protocol/chronotype).
--
-- RLS: agenda_events ya tiene FOR ALL (auth.uid() = user_id) desde 098 —
-- añadir una columna no la altera. Idempotente (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS intervention_key TEXT;

-- Lookup de reconciliación: eventos de intervención de un user por key.
CREATE INDEX IF NOT EXISTS idx_agenda_events_intervention_key
  ON agenda_events(user_id, intervention_key)
  WHERE intervention_key IS NOT NULL;

NOTIFY pgrst, 'reload schema';
