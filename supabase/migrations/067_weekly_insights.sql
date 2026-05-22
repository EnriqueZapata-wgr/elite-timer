-- ============================================================================
-- 067 — WEEKLY INSIGHTS: caché del insight semanal generado por ARGOS
-- ============================================================================
-- Una fila por (user_id, week_start). week_start es el lunes ISO de la semana.
-- Limita a 1 llamada LLM por semana por usuario.
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  insight_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own weekly insights"
  ON weekly_insights FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own weekly insights"
  ON weekly_insights FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own weekly insights"
  ON weekly_insights FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_week
  ON weekly_insights(user_id, week_start DESC);
