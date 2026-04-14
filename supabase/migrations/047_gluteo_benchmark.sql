-- 047 — Agregar benchmark Glúteo (Hip Thrust) + variantes

-- Benchmark: Hip Thrust
INSERT INTO exercises (
  name, name_es, is_benchmark, muscle_groups, equipment_list,
  instructions, difficulty
) VALUES (
  'Hip Thrust', 'Hip Thrust',
  true,
  ARRAY['Glúteo', 'Isquiotibiales', 'Core'],
  ARRAY['barra', 'banco'],
  'Espalda apoyada en banco, barra sobre cadera. Extiende caderas completamente arriba, aprieta glúteo 1 segundo, baja controlado.',
  'intermediate'
) ON CONFLICT (name) DO NOTHING;

-- Variantes de glúteo
DO $$
DECLARE
  hip_thrust_id UUID;
BEGIN
  SELECT id INTO hip_thrust_id FROM exercises WHERE name = 'Hip Thrust' AND is_benchmark = true LIMIT 1;

  IF hip_thrust_id IS NOT NULL THEN
    INSERT INTO exercises (name, name_es, parent_exercise_id, is_benchmark, muscle_groups, equipment_list, difficulty)
    VALUES
      ('Hip Thrust Machine', 'Hip Thrust máquina', hip_thrust_id, false, ARRAY['Glúteo', 'Isquiotibiales'], ARRAY['máquina hip thrust'], 'beginner'),
      ('Hip Thrust Smith', 'Hip Thrust Smith', hip_thrust_id, false, ARRAY['Glúteo', 'Isquiotibiales'], ARRAY['smith', 'banco'], 'beginner'),
      ('Hip Thrust Single Leg', 'Hip Thrust una pierna', hip_thrust_id, false, ARRAY['Glúteo', 'Isquiotibiales', 'Core'], ARRAY['barra', 'banco'], 'advanced'),
      ('Glute Bridge', 'Puente de glúteo', hip_thrust_id, false, ARRAY['Glúteo', 'Isquiotibiales'], ARRAY['barra'], 'beginner'),
      ('Cable Kickback', 'Patada en polea', hip_thrust_id, false, ARRAY['Glúteo'], ARRAY['polea'], 'beginner'),
      ('Bulgarian Split Squat Glute', 'Sentadilla búlgara (glúteo)', hip_thrust_id, false, ARRAY['Glúteo', 'Cuádriceps', 'Isquiotibiales'], ARRAY['mancuernas', 'banco'], 'intermediate'),
      ('Romanian Deadlift', 'Peso muerto rumano', hip_thrust_id, false, ARRAY['Glúteo', 'Isquiotibiales', 'Espalda baja'], ARRAY['barra'], 'intermediate')
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;
