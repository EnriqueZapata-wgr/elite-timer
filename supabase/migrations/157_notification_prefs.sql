-- ============================================================================
-- 157 — NOTIFICATION PREFS GRANULARES (#61) — sprint polish 2026-07-07.
-- Rango Fable 150-199.
--
-- Control per-usuario del dispatch de notificaciones:
--   mode: standard (toggles) | adaptive_argos (ARGOS decide, Pro) | silent
--         (solo críticas de sistema)
--   toggles por tipo + quiet hours + DND en consulta clínica (V1.5+).
--
-- Enforcement: dispatch-agenda-notifications lee esta tabla antes de armar
-- el push (skip si agenda_enabled=false, mode=silent o dentro de quiet hours).
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'adaptive_argos', 'silent')),
  agenda_enabled BOOLEAN NOT NULL DEFAULT true,
  argos_enabled BOOLEAN NOT NULL DEFAULT true,
  streak_enabled BOOLEAN NOT NULL DEFAULT true,
  community_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  dnd_during_consultation BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notification_prefs_select" ON user_notification_prefs;
CREATE POLICY "own_notification_prefs_select" ON user_notification_prefs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_notification_prefs_insert" ON user_notification_prefs;
CREATE POLICY "own_notification_prefs_insert" ON user_notification_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_notification_prefs_update" ON user_notification_prefs;
CREATE POLICY "own_notification_prefs_update" ON user_notification_prefs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION touch_user_notification_prefs_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_notification_prefs_touch ON user_notification_prefs;
CREATE TRIGGER trg_user_notification_prefs_touch BEFORE UPDATE ON user_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION touch_user_notification_prefs_updated_at();

COMMENT ON TABLE user_notification_prefs IS
  'Preferencias granulares de notificaciones (#61): modo + toggles por tipo + quiet hours + DND consulta.';
