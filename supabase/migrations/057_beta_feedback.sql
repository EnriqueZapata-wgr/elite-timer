-- 057 — Sistema de feedback beta

CREATE TABLE IF NOT EXISTS beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,

  -- Qué reporta
  screen_name TEXT,
  severity TEXT NOT NULL DEFAULT 'yellow' CHECK (severity IN ('red', 'yellow', 'green')),
  category TEXT DEFAULT 'bug' CHECK (category IN ('bug', 'ux', 'suggestion', 'content', 'performance')),

  -- Contenido
  description TEXT NOT NULL,
  expected TEXT,
  screenshot_url TEXT,

  -- Meta
  device_info TEXT,
  app_version TEXT,

  -- Estado (para admin)
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'in_progress', 'fixed', 'wont_fix', 'duplicate')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  fixed_in_commit TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Testers pueden crear sus propios reportes
CREATE POLICY "Users insert feedback" ON beta_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Testers pueden leer sus propios reportes
CREATE POLICY "Users read own feedback" ON beta_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Admin puede ver y editar TODO
CREATE POLICY "Admin full access feedback" ON beta_feedback
  FOR ALL USING (auth.uid() = '90a55e74-0e3d-477a-9ac5-2b339f7c40af');

CREATE INDEX IF NOT EXISTS idx_feedback_status ON beta_feedback(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_screen ON beta_feedback(screen_name, created_at DESC);
