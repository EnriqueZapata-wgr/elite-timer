-- ============================================================================
-- 237 — LOG DE NAVEGACIÓN EMOCIONAL (MB-9 · Track C.1): el diferenciador.
--
-- ATP no solo sabe cómo te sentiste: con la navegación sabe HACIA DÓNDE te
-- moviste y — cruzando con tu siguiente check-in — si funcionó. Este log guarda,
-- por cada movimiento que el usuario TOMÓ (bajar / reencuadrar / cruzar / subir /
-- canalizar / saborear), la emoción de origen y el momento. La efectividad se
-- calcula 100% del lado del dueño (emotion-stats-core): CERO comparación cross-user.
--
-- DOCTRINA: dato clínico-adyacente → RLS estricta, el usuario gestiona lo suyo y
-- nadie más lo lee. Idempotente (IF NOT EXISTS / EXCEPTION duplicate_object).
-- ============================================================================

CREATE TABLE IF NOT EXISTS emotion_navigation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Origen del movimiento (opcional: el log sobrevive si se borra el check-in).
  checkin_id UUID REFERENCES emotional_checkins(id) ON DELETE SET NULL,
  emotion_id TEXT NOT NULL,
  move TEXT NOT NULL CHECK (move IN ('bajar','reencuadrar','cruzar','subir','canalizar','saborear')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotion_nav_logs_user_date
  ON emotion_navigation_logs(user_id, created_at DESC);

ALTER TABLE emotion_navigation_logs ENABLE ROW LEVEL SECURITY;

-- El dueño gestiona su propio log; nadie más lo lee (dato de salud emocional).
DO $$ BEGIN
  CREATE POLICY "Users manage own emotion_navigation_logs" ON emotion_navigation_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
