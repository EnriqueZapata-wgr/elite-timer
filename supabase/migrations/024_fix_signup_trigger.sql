-- ============================================================
-- Migración 024: Fix "Database error saving new user"
--
-- Problema: El trigger handle_new_user() falla al registrar usuarios nuevos
-- porque no maneja todas las tablas con FK a profiles (tablas añadidas
-- después de la migración 008) y porque full_name puede ser NOT NULL.
--
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- 1. Asegurar que full_name sea nullable (causa más común del error)
ALTER TABLE profiles ALTER COLUMN full_name DROP NOT NULL;

-- 2. Agregar default a full_name si no tiene
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT '';

-- 3. Hacer nullable cualquier otro campo que pudiera causar problemas
-- (role, avatar_url, u otros campos custom que se hayan añadido)
DO $$
BEGIN
  -- role
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    EXECUTE 'ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL';
  END IF;
  -- avatar_url
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    EXECUTE 'ALTER TABLE profiles ALTER COLUMN avatar_url DROP NOT NULL';
  END IF;
END $$;

-- 4. Recrear el trigger con TODAS las tablas que tienen FK a profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_old_id UUID;
BEGIN
  -- Buscar si existe un perfil placeholder con el mismo email
  SELECT id INTO v_old_id FROM profiles
    WHERE email = lower(NEW.email) AND id != NEW.id
    LIMIT 1;

  IF v_old_id IS NOT NULL THEN
    -- Migrar TODAS las referencias del placeholder al usuario real
    -- Tablas de migración 001-008 (originales)
    UPDATE coach_clients SET client_id = NEW.id WHERE client_id = v_old_id;
    UPDATE client_profiles SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE condition_flags SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE body_measurements SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE lab_results SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE medications SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE supplement_protocols SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE family_history SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE protocol_assignments SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE scheduled_routines SET user_id = NEW.id WHERE user_id = v_old_id;

    -- Tablas de migraciones posteriores (003-022)
    UPDATE daily_protocol_items SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE emotional_checkins SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE consultations SET client_id = NEW.id WHERE client_id = v_old_id;
    UPDATE consultations SET coach_id = NEW.id WHERE coach_id = v_old_id;
    UPDATE daily_habits_map SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE health_scores SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE lab_uploads SET user_id = NEW.id WHERE user_id = v_old_id;
    UPDATE ai_reports SET user_id = NEW.id WHERE user_id = v_old_id;

    -- Tablas que referencian profiles.id como assigned_by, measured_by, etc.
    UPDATE scheduled_routines SET assigned_by = NEW.id WHERE assigned_by = v_old_id;
    UPDATE body_measurements SET measured_by = NEW.id WHERE measured_by = v_old_id;

    -- Eliminar el placeholder
    DELETE FROM profiles WHERE id = v_old_id;
  END IF;

  -- Insertar o actualizar el perfil del nuevo usuario
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, lower(NEW.email), COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO UPDATE SET
    email = lower(NEW.email),
    full_name = COALESCE(NULLIF(profiles.full_name, ''), NEW.raw_user_meta_data->>'full_name', '');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Asegurar que el trigger existe en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. Verificar: listar columnas NOT NULL sin default en profiles
-- (ejecutar esto como SELECT para diagnóstico)
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND is_nullable = 'NO' AND column_default IS NULL;
