-- ============================================================
-- Migración 150 (AGENDA-COMPLETE F3): tabla user_notifications — inbox de
-- notificaciones in-app (campana en HOY + pantalla /notifications).
-- La Edge Function dispatch-agenda-notifications inserta una row por
-- recordatorio procesado (además del push a Expo).
--
-- Idempotente: IF NOT EXISTS en tabla/índice, DO-block para la policy.
-- Rango 150-199 (Fable). ⚠️ Aplicar vía MCP execute_sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'agenda_reminder' | 'insight' | 'lab_ready' | etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,  -- eventId, route, etc.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications(user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'user_notifications_own'
  ) THEN
    CREATE POLICY user_notifications_own ON user_notifications
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
