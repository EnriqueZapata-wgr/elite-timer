-- ============================================================================
-- 039 — SISTEMA DE ELECTRONES (GAMIFICACIÓN)
-- ============================================================================

-- Registro simple de electrones booleanos del día (JSONB)
-- Usado por el tablero de HOY para togglear hábitos
CREATE TABLE IF NOT EXISTS daily_electrons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  electrons JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_electrons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own electrons" ON daily_electrons
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_electrons_user_date
  ON daily_electrons(user_id, date);

-- Registro detallado de electrones ganados (para acumulado + rangos)
CREATE TABLE IF NOT EXISTS electron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  electrons DECIMAL(5,2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE electron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own electron_logs" ON electron_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_electron_logs_user_date
  ON electron_logs(user_id, date);

-- Tabla de rangos (referencia estática, lectura pública)
CREATE TABLE IF NOT EXISTS electron_ranks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  min_electrons INTEGER NOT NULL,
  max_electrons INTEGER,
  icon TEXT NOT NULL,
  color TEXT NOT NULL
);

ALTER TABLE electron_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ranks" ON electron_ranks
  FOR SELECT USING (true);

-- Seed de rangos
INSERT INTO electron_ranks (name, min_electrons, max_electrons, icon, color) VALUES
  ('Partícula', 0, 50, 'flash-outline', '#999999'),
  ('Átomo', 51, 200, 'nuclear-outline', '#38bdf8'),
  ('Molécula', 201, 500, 'git-merge-outline', '#a8e02a'),
  ('Reactor', 501, 1000, 'flame-outline', '#fbbf24'),
  ('Fusión', 1001, 2500, 'sunny-outline', '#fb923c'),
  ('Supernova', 2501, NULL, 'star-outline', '#c084fc')
ON CONFLICT DO NOTHING;
