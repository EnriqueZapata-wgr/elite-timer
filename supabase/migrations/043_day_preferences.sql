-- ============================================================================
-- 043 — USER DAY PREFERENCES
-- Qué electrones tiene activos y acciones custom del día
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_day_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active_boolean_electrons TEXT[] DEFAULT ARRAY['sunlight','meditation','supplements','cold_shower','grounding','no_alcohol'],
  active_quantitative_electrons TEXT[] DEFAULT ARRAY['protein','steps','water'],
  custom_agenda_actions JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_day_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own day_prefs" ON user_day_preferences
  FOR ALL USING (auth.uid() = user_id);
