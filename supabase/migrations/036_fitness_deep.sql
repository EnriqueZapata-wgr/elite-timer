-- =====================================================
-- 036_fitness_deep.sql
-- Modelo de datos fitness profundo:
--   - exercises: ALTER para soportar benchmark + variantes
--   - cardio_sessions: tracking de cardio (running/cycling/swim/rowing)
--   - cardio_records: PRs de cardio por distancia
--   - mobility_assessments: evaluaciones de movilidad
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1) EJERCICIOS — extender tabla existente
-- ─────────────────────────────────────────────────────
-- La tabla exercises ya existe (creada en Supabase). Le agregamos:
--   name_es, is_benchmark, parent_exercise_id, muscle_groups[], equipment[],
--   instructions, video_url, thumbnail_url, difficulty
-- Mantenemos las columnas legacy (muscle_group, equipment como TEXT) para
-- no romper queries existentes.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS name_es TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_benchmark BOOLEAN DEFAULT false;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS parent_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_groups TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_list TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty TEXT;

DO $$ BEGIN
  ALTER TABLE exercises ADD CONSTRAINT exercises_difficulty_check
    CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_exercises_parent ON exercises(parent_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_benchmark ON exercises(is_benchmark) WHERE is_benchmark = true;

-- ─────────────────────────────────────────────────────
-- 2) CARDIO SESSIONS
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cardio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  discipline TEXT NOT NULL CHECK (discipline IN ('running', 'cycling', 'swimming', 'rowing', 'other')),

  -- Métricas universales
  duration_seconds INTEGER,
  distance_meters DECIMAL(10,2),
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_pace_seconds_per_km INTEGER,

  -- Específicas de running
  cadence_spm INTEGER,
  elevation_gain_m DECIMAL(6,1),

  -- Específicas de cycling
  avg_power_watts INTEGER,
  avg_speed_kmh DECIMAL(5,1),

  -- Específicas de swimming
  pool_length_m INTEGER,
  total_laps INTEGER,
  avg_stroke_rate INTEGER,
  stroke_type TEXT CHECK (stroke_type IS NULL OR stroke_type IN ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'mixed')),

  -- Específicas de rowing
  avg_split_500m INTEGER,
  stroke_rate_spm INTEGER,

  perceived_effort INTEGER CHECK (perceived_effort IS NULL OR perceived_effort BETWEEN 1 AND 10),
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'wearable', 'strava', 'garmin')),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardio_user_date ON cardio_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cardio_discipline ON cardio_sessions(user_id, discipline);

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "User manages own cardio sessions" ON cardio_sessions
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────
-- 3) CARDIO RECORDS (PRs)
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cardio_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  discipline TEXT NOT NULL,
  distance_label TEXT NOT NULL,
  best_time_seconds INTEGER NOT NULL,
  achieved_at DATE NOT NULL,
  session_id UUID REFERENCES cardio_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, discipline, distance_label)
);

CREATE INDEX IF NOT EXISTS idx_cardio_records_user ON cardio_records(user_id, discipline);

ALTER TABLE cardio_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "User manages own cardio records" ON cardio_records
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────
-- 4) MOBILITY ASSESSMENTS
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mobility_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  deep_squat INTEGER CHECK (deep_squat IS NULL OR deep_squat BETWEEN 0 AND 10),
  overhead_squat INTEGER CHECK (overhead_squat IS NULL OR overhead_squat BETWEEN 0 AND 10),
  toe_touch_cm DECIMAL(4,1),
  shoulder_rotation_l INTEGER CHECK (shoulder_rotation_l IS NULL OR shoulder_rotation_l BETWEEN 0 AND 10),
  shoulder_rotation_r INTEGER CHECK (shoulder_rotation_r IS NULL OR shoulder_rotation_r BETWEEN 0 AND 10),
  hip_flexion_l INTEGER CHECK (hip_flexion_l IS NULL OR hip_flexion_l BETWEEN 0 AND 10),
  hip_flexion_r INTEGER CHECK (hip_flexion_r IS NULL OR hip_flexion_r BETWEEN 0 AND 10),
  ankle_dorsiflexion_l_cm DECIMAL(4,1),
  ankle_dorsiflexion_r_cm DECIMAL(4,1),
  thoracic_rotation_l INTEGER CHECK (thoracic_rotation_l IS NULL OR thoracic_rotation_l BETWEEN 0 AND 10),
  thoracic_rotation_r INTEGER CHECK (thoracic_rotation_r IS NULL OR thoracic_rotation_r BETWEEN 0 AND 10),

  overall_score DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mobility_user_date ON mobility_assessments(user_id, date DESC);

ALTER TABLE mobility_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "User manages own mobility" ON mobility_assessments
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- SEED — 6 BENCHMARKS + VARIANTES (~32 ejercicios)
-- =====================================================
-- IDs deterministas para los benchmarks (para que las variantes los referencien sin lookup).
-- Usamos UPSERT (ON CONFLICT) para que sea idempotente.

-- ── SQUAT (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000001', 'Back Squat', 'Sentadilla libre', 'strength', 'legs', 'barbell',
  ARRAY['quads','glutes','hamstrings','core'], ARRAY['barbell','rack'], true, true,
  'El rey de los ejercicios de pierna. Barra en la espalda, sentadilla completa.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000011', 'Hack Squat', 'Hack squat', 'strength', 'legs', 'machine', ARRAY['quads','glutes'], ARRAY['machine'], false, '00000000-0000-0000-0001-000000000001', true, 'Maquina que guia el movimiento. Menos demanda de core.', 'beginner'),
  ('00000000-0000-0000-0001-000000000012', 'Smith Machine Squat', 'Sentadilla Smith', 'strength', 'legs', 'machine', ARRAY['quads','glutes'], ARRAY['smith_machine'], false, '00000000-0000-0000-0001-000000000001', true, 'Barra guiada. Util para principiantes o rehabilitacion.', 'beginner'),
  ('00000000-0000-0000-0001-000000000013', 'Front Squat', 'Sentadilla frontal', 'strength', 'legs', 'barbell', ARRAY['quads','core','upper_back'], ARRAY['barbell','rack'], false, '00000000-0000-0000-0001-000000000001', true, 'Barra al frente. Mayor demanda de cuadriceps y core.', 'advanced'),
  ('00000000-0000-0000-0001-000000000014', 'Goblet Squat', 'Sentadilla goblet', 'strength', 'legs', 'dumbbell', ARRAY['quads','glutes'], ARRAY['dumbbell','kettlebell'], false, '00000000-0000-0000-0001-000000000001', true, 'Con mancuerna o kettlebell al pecho. Ideal para aprender.', 'beginner'),
  ('00000000-0000-0000-0001-000000000015', 'Bulgarian Split Squat', 'Sentadilla bulgara', 'strength', 'legs', 'dumbbell', ARRAY['quads','glutes','balance'], ARRAY['dumbbell','bodyweight'], false, '00000000-0000-0000-0001-000000000001', true, 'Unilateral. Pie trasero elevado.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000016', 'Leg Press', 'Prensa de pierna', 'strength', 'legs', 'machine', ARRAY['quads','glutes'], ARRAY['machine'], false, '00000000-0000-0000-0001-000000000001', true, 'Maquina de empuje. Alto volumen con menos fatiga del sistema nervioso.', 'beginner')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

-- ── DEADLIFT (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000002', 'Conventional Deadlift', 'Peso muerto convencional', 'strength', 'back', 'barbell',
  ARRAY['hamstrings','glutes','back','core','traps'], ARRAY['barbell'], true, true,
  'El ejercicio mas completo. Levanta peso del suelo.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000021', 'Sumo Deadlift', 'Peso muerto sumo', 'strength', 'back', 'barbell', ARRAY['glutes','adductors','hamstrings','back'], ARRAY['barbell'], false, '00000000-0000-0000-0001-000000000002', true, 'Agarre ancho, piernas separadas. Mas gluteos, menos espalda baja.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000022', 'Romanian Deadlift', 'Peso muerto rumano', 'strength', 'back', 'barbell', ARRAY['hamstrings','glutes','back'], ARRAY['barbell','dumbbell'], false, '00000000-0000-0000-0001-000000000002', true, 'Piernas semi-rectas. Enfoque en isquiotibiales.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000023', 'Trap Bar Deadlift', 'Peso muerto con trap bar', 'strength', 'back', 'barbell', ARRAY['quads','hamstrings','glutes','back'], ARRAY['trap_bar'], false, '00000000-0000-0000-0001-000000000002', true, 'Barra hexagonal. Mas amigable para la espalda.', 'beginner'),
  ('00000000-0000-0000-0001-000000000024', 'Single Leg RDL', 'Peso muerto rumano unilateral', 'strength', 'back', 'dumbbell', ARRAY['hamstrings','glutes','balance'], ARRAY['dumbbell','kettlebell'], false, '00000000-0000-0000-0001-000000000002', true, 'A una pierna. Balance y activacion de gluteo medio.', 'advanced')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

-- ── BENCH PRESS (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000003', 'Bench Press', 'Press de banca', 'strength', 'chest', 'barbell',
  ARRAY['chest','triceps','shoulders'], ARRAY['barbell','bench'], true, true,
  'El benchmark de empuje horizontal. Barra libre en banca plana.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000031', 'Incline Bench Press', 'Press inclinado', 'strength', 'chest', 'barbell', ARRAY['upper_chest','shoulders','triceps'], ARRAY['barbell','bench'], false, '00000000-0000-0000-0001-000000000003', true, 'Banca a 30-45 grados. Mayor activacion de pecho superior.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000032', 'Dumbbell Bench Press', 'Press con mancuernas', 'strength', 'chest', 'dumbbell', ARRAY['chest','triceps','shoulders'], ARRAY['dumbbell','bench'], false, '00000000-0000-0000-0001-000000000003', true, 'Mayor rango de movimiento que barra. Trabajo unilateral.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000033', 'Machine Chest Press', 'Press pecho maquina', 'strength', 'chest', 'machine', ARRAY['chest','triceps'], ARRAY['machine'], false, '00000000-0000-0000-0001-000000000003', true, 'Movimiento guiado. Bueno para volumen sin fatiga neural.', 'beginner'),
  ('00000000-0000-0000-0001-000000000034', 'Dips', 'Fondos en paralelas', 'strength', 'chest', 'bodyweight', ARRAY['chest','triceps','shoulders'], ARRAY['parallel_bars','bodyweight'], false, '00000000-0000-0000-0001-000000000003', true, 'Empuje con peso corporal. Inclinacion al frente = mas pecho.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000035', 'Cable Fly', 'Aperturas en cable', 'strength', 'chest', 'cable', ARRAY['chest'], ARRAY['cable'], false, '00000000-0000-0000-0001-000000000003', true, 'Aislamiento de pecho. Tension constante.', 'beginner')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

-- ── OHP (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000004', 'Overhead Press', 'Press militar', 'strength', 'shoulders', 'barbell',
  ARRAY['shoulders','triceps','core'], ARRAY['barbell'], true, true,
  'Press vertical con barra. Fuerza funcional de empuje.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000041', 'Dumbbell Shoulder Press', 'Press hombro mancuernas', 'strength', 'shoulders', 'dumbbell', ARRAY['shoulders','triceps'], ARRAY['dumbbell'], false, '00000000-0000-0000-0001-000000000004', true, 'Mayor rango y trabajo unilateral.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000042', 'Machine Shoulder Press', 'Press hombro maquina', 'strength', 'shoulders', 'machine', ARRAY['shoulders','triceps'], ARRAY['machine'], false, '00000000-0000-0000-0001-000000000004', true, 'Guiado. Bueno para volumen.', 'beginner'),
  ('00000000-0000-0000-0001-000000000043', 'Push Press', 'Push press', 'strength', 'shoulders', 'barbell', ARRAY['shoulders','triceps','legs','core'], ARRAY['barbell'], false, '00000000-0000-0000-0001-000000000004', true, 'Con impulso de piernas. Permite mas peso.', 'advanced'),
  ('00000000-0000-0000-0001-000000000044', 'Lateral Raise', 'Elevacion lateral', 'strength', 'shoulders', 'dumbbell', ARRAY['shoulders'], ARRAY['dumbbell'], false, '00000000-0000-0000-0001-000000000004', true, 'Aislamiento de deltoides lateral.', 'beginner')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

-- ── PULL-UP (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000005', 'Pull-up', 'Dominada', 'strength', 'back', 'bodyweight',
  ARRAY['lats','biceps','upper_back','core'], ARRAY['pull_up_bar','bodyweight'], true, true,
  'El benchmark de jalon vertical. Agarre prono.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000051', 'Chin-up', 'Dominada supina', 'strength', 'back', 'bodyweight', ARRAY['biceps','lats','upper_back'], ARRAY['pull_up_bar','bodyweight'], false, '00000000-0000-0000-0001-000000000005', true, 'Agarre supino. Mayor biceps.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000052', 'Weighted Pull-up', 'Dominada lastrada', 'strength', 'back', 'bodyweight', ARRAY['lats','biceps','upper_back','core'], ARRAY['pull_up_bar','weight_belt'], false, '00000000-0000-0000-0001-000000000005', true, 'Con peso adicional. Para avanzados.', 'advanced'),
  ('00000000-0000-0000-0001-000000000053', 'Lat Pulldown', 'Jalon al pecho', 'strength', 'back', 'cable', ARRAY['lats','biceps'], ARRAY['cable','machine'], false, '00000000-0000-0000-0001-000000000005', true, 'Version asistida en polea. Para construir fuerza hacia pull-ups.', 'beginner'),
  ('00000000-0000-0000-0001-000000000054', 'Band Assisted Pull-up', 'Dominada con banda', 'strength', 'back', 'bodyweight', ARRAY['lats','biceps','upper_back'], ARRAY['pull_up_bar','band'], false, '00000000-0000-0000-0001-000000000005', true, 'Con banda elastica de asistencia.', 'beginner')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

-- ── ROW (Benchmark) ──
INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, is_public, description, difficulty)
VALUES ('00000000-0000-0000-0001-000000000006', 'Barbell Row', 'Remo con barra', 'strength', 'back', 'barbell',
  ARRAY['upper_back','lats','biceps','core'], ARRAY['barbell'], true, true,
  'Jalon horizontal con barra. Espalda completa.', 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  is_benchmark = true,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;

INSERT INTO exercises (id, name, name_es, category, muscle_group, equipment, muscle_groups, equipment_list, is_benchmark, parent_exercise_id, is_public, description, difficulty) VALUES
  ('00000000-0000-0000-0001-000000000061', 'Dumbbell Row', 'Remo con mancuerna', 'strength', 'back', 'dumbbell', ARRAY['upper_back','lats','biceps'], ARRAY['dumbbell','bench'], false, '00000000-0000-0000-0001-000000000006', true, 'Unilateral. Mayor rango de movimiento.', 'beginner'),
  ('00000000-0000-0000-0001-000000000062', 'Cable Row', 'Remo en polea', 'strength', 'back', 'cable', ARRAY['upper_back','lats','biceps'], ARRAY['cable'], false, '00000000-0000-0000-0001-000000000006', true, 'Tension constante. Varias agarres posibles.', 'beginner'),
  ('00000000-0000-0000-0001-000000000063', 'T-Bar Row', 'Remo T-bar', 'strength', 'back', 'barbell', ARRAY['upper_back','lats','biceps'], ARRAY['barbell','landmine'], false, '00000000-0000-0000-0001-000000000006', true, 'Barra anclada. Permite mas peso.', 'intermediate'),
  ('00000000-0000-0000-0001-000000000064', 'Pendlay Row', 'Remo Pendlay', 'strength', 'back', 'barbell', ARRAY['upper_back','lats','core'], ARRAY['barbell'], false, '00000000-0000-0000-0001-000000000006', true, 'Remo estricto desde el suelo. Sin impulso.', 'advanced')
ON CONFLICT (id) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  parent_exercise_id = EXCLUDED.parent_exercise_id,
  muscle_groups = EXCLUDED.muscle_groups,
  equipment_list = EXCLUDED.equipment_list,
  difficulty = EXCLUDED.difficulty;
