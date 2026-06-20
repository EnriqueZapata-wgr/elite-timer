-- ============================================================
-- Migración 050: ARGOS Conversations + Daily Insights
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- Conversaciones de ARGOS
CREATE TABLE IF NOT EXISTS argos_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Conversación',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE argos_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own argos_conversations" ON argos_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_argos_conv_user ON argos_conversations(user_id, updated_at DESC);

-- Cache de insights diarios para no regenerar cada vez
CREATE TABLE IF NOT EXISTS argos_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  insight TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE argos_daily_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own argos_insights" ON argos_daily_insights
  FOR ALL USING (auth.uid() = user_id);
