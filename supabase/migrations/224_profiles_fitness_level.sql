-- 224 · MB-3.6 Bloque 1.3 — nivel de fitness al PERFIL (fuente de verdad).
-- Antes vivía solo en AsyncStorage del generador (fitness_generator_prefs_v1);
-- ahora profiles.fitness_level manda y AsyncStorage queda como caché offline.
-- Idempotente. profiles ya tiene RLS owner (migraciones previas) — esto solo
-- agrega columna + constraint, no crea tabla.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_level TEXT;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_fitness_level_check
    CHECK (fitness_level IS NULL OR fitness_level IN ('principiante', 'intermedio', 'avanzado', 'atleta'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN profiles.fitness_level IS
  'Nivel de entrenamiento del usuario (MB-3.6): lo pregunta Fitness la primera vez, editable en Ajustes. El generador de rutinas lo lee de aquí.';
