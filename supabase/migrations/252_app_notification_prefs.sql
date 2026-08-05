-- 252 · MB-23 Pieza 3 — Avisos por app (modelo mixto).
--
-- En Ajustes general se quedan el interruptor maestro (modo silent), las
-- categorías y las horas de silencio (user_notification_prefs, 157). En la
-- ficha de cada app entra LO SUYO: si avisa, a qué hora y bajo qué condición.
--
-- ⚠️ EL GENERAL MANDA. Si el maestro está apagado, ninguna app avisa aunque
--    su fila diga enabled. Esa decisión NO vive aquí: vive en planAppAviso
--    (notification-prefs-core.ts, puro y con test). Esta tabla solo guarda
--    la voluntad de la ficha.
--
-- Quien no tiene fila hereda el comportamiento de hoy: ningún aviso por app
-- (el default de su categoría sigue mandando para agenda/push como siempre).
--
-- Idempotente. RLS owner-only. db push ANTES del OTA.

CREATE TABLE IF NOT EXISTS user_app_notification_prefs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  notify_time TEXT NOT NULL DEFAULT '21:00' CHECK (notify_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  condition TEXT NOT NULL DEFAULT 'not_done_today' CHECK (condition IN ('not_done_today', 'always')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app_key)
);

ALTER TABLE user_app_notification_prefs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_app_notification_prefs'
      AND policyname = 'Users own app notification prefs'
  ) THEN
    CREATE POLICY "Users own app notification prefs" ON user_app_notification_prefs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
