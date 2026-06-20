-- ============================================================================
-- 045 — FITNESS DEEP: Equipment tracking + Training preferences
-- Estructura future-ready para generación de rutinas con IA
-- ============================================================================

-- Equipo disponible del usuario
CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  equipment TEXT NOT NULL,
  location TEXT DEFAULT 'gym',
  UNIQUE(user_id, equipment)
);

ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own equipment" ON user_equipment
  FOR ALL USING (auth.uid() = user_id);

-- Preferencias de entrenamiento
CREATE TABLE IF NOT EXISTS training_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  goal TEXT DEFAULT 'general',
  experience_level TEXT DEFAULT 'intermediate',
  days_per_week INTEGER DEFAULT 4,
  session_duration_min INTEGER DEFAULT 60,
  preferred_split TEXT DEFAULT 'upper_lower',
  injuries TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own training_prefs" ON training_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Agregar date a exercise_logs si no existe (para queries por día)
DO $$ BEGIN
  ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS date DATE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
