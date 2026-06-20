-- ============================================================================
-- 042 — CICLO MENSTRUAL OVERHAUL
-- Nuevo schema unificado: cycle_daily_logs reemplaza cycle_symptoms
-- Las tablas 034 (cycle_periods, cycle_symptoms, cycle_settings) se mantienen
-- ============================================================================

-- Registro diario unificado de ciclo
CREATE TABLE IF NOT EXISTS cycle_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Periodo
  is_period BOOLEAN DEFAULT false,
  flow_level TEXT CHECK (flow_level IS NULL OR flow_level IN ('spotting', 'light', 'medium', 'heavy')),

  -- Síntomas (escala 1-5)
  energy INTEGER CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  mood INTEGER CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
  appetite INTEGER CHECK (appetite IS NULL OR appetite BETWEEN 1 AND 5),
  libido INTEGER CHECK (libido IS NULL OR libido BETWEEN 1 AND 5),
  cramps INTEGER CHECK (cramps IS NULL OR cramps BETWEEN 1 AND 5),
  bloating INTEGER CHECK (bloating IS NULL OR bloating BETWEEN 1 AND 5),
  headache INTEGER CHECK (headache IS NULL OR headache BETWEEN 1 AND 5),
  breast_tenderness INTEGER CHECK (breast_tenderness IS NULL OR breast_tenderness BETWEEN 1 AND 5),
  acne INTEGER CHECK (acne IS NULL OR acne BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 1 AND 5),

  -- Relaciones sexuales
  had_sex BOOLEAN DEFAULT false,
  sex_protected BOOLEAN,

  -- Datos biométricos
  temperature_c DECIMAL(4,2),
  hrv_ms INTEGER,
  resting_hr INTEGER,

  -- Notas
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE cycle_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own cycle_daily_logs" ON cycle_daily_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_daily_user_date
  ON cycle_daily_logs(user_id, date);

-- Agregar columnas faltantes a cycle_periods si existen de migración 034
DO $$ BEGIN
  ALTER TABLE cycle_periods ADD COLUMN IF NOT EXISTS cycle_length INTEGER;
  ALTER TABLE cycle_periods ADD COLUMN IF NOT EXISTS period_length INTEGER;
  ALTER TABLE cycle_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
