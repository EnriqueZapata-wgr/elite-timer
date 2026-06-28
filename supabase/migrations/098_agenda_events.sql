-- ============================================================
-- Migración 098: Agenda events (sistema CRUD + tracking + notificaciones)
-- Idempotente: CREATE ... IF NOT EXISTS + DROP POLICY IF EXISTS antes de CREATE POLICY
-- (CREATE POLICY no soporta IF NOT EXISTS).
-- ============================================================

-- TABLA 1: eventos plantilla del usuario (recurrentes o únicos)
CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  time TIME NOT NULL,                          -- hora del día, ej. 07:00
  category TEXT NOT NULL,                      -- nutricion, fitness, sueño, mente, ritmo, etc.
  source TEXT NOT NULL DEFAULT 'manual',       -- 'manual' | 'protocol' | 'chronotype' | 'manual_override'
  duration_min INT,                            -- opcional
  notify_minutes_before INT DEFAULT 0,         -- 0 = sin notif; 5/10/15/30/60
  is_active BOOLEAN DEFAULT TRUE,              -- soft delete
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_user ON agenda_events(user_id, time);

ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agenda_events_own ON agenda_events;
CREATE POLICY agenda_events_own ON agenda_events FOR ALL USING (auth.uid() = user_id);

-- TABLA 2: log de instancias diarias (tracking estado + scheduling notif)
CREATE TABLE IF NOT EXISTS agenda_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES agenda_events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | completed | skipped | snoozed
  scheduled_at TIMESTAMPTZ NOT NULL,           -- timestamp completo del evento
  notify_at TIMESTAMPTZ,                       -- cuándo disparar push (NULL = no notif)
  notified_at TIMESTAMPTZ,                     -- cuándo se envió la push (NULL = pendiente)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_agenda_log_per_day
  ON agenda_event_logs(user_id, event_id, date);
CREATE INDEX IF NOT EXISTS idx_agenda_logs_notify_pending
  ON agenda_event_logs(notify_at) WHERE notified_at IS NULL AND notify_at IS NOT NULL;

ALTER TABLE agenda_event_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agenda_event_logs_own ON agenda_event_logs;
CREATE POLICY agenda_event_logs_own ON agenda_event_logs FOR ALL USING (auth.uid() = user_id);

-- TABLA 3: tokens push de los devices del usuario
CREATE TABLE IF NOT EXISTS user_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL,                      -- 'ios' | 'android'
  device_id TEXT,                              -- opcional, para múltiples devices
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_token ON user_notification_tokens(user_id, expo_push_token);

ALTER TABLE user_notification_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notification_tokens_own ON user_notification_tokens;
CREATE POLICY user_notification_tokens_own ON user_notification_tokens FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
