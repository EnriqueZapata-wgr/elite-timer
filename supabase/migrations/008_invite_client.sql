-- ============================================================
-- Migración: Invitar cliente por email desde panel coach
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- Función: coach invita/crea cliente por email
CREATE OR REPLACE FUNCTION invite_client_by_email(p_coach_id UUID, p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_is_new BOOLEAN := false;
BEGIN
  p_email := lower(trim(p_email));

  SELECT id, full_name INTO v_client_id, v_client_name
  FROM profiles WHERE email = p_email;

  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    v_is_new := true;
    INSERT INTO profiles (id, email, full_name)
    VALUES (v_client_id, p_email, NULL);
    v_client_name := NULL;
  END IF;

  IF v_client_id = p_coach_id THEN
    RAISE EXCEPTION 'No puedes agregarte como cliente';
  END IF;

  INSERT INTO coach_clients (coach_id, client_id, status)
  VALUES (p_coach_id, v_client_id, 'active')
  ON CONFLICT (coach_id, client_id)
  DO UPDATE SET status = 'active', connected_at = now();

  INSERT INTO client_profiles (user_id)
  VALUES (v_client_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'client_id', v_client_id,
    'email', p_email,
    'name', v_client_name,
    'is_new', v_is_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar handle_new_user para vincular placeholders
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id) THEN
    UPDATE coach_clients SET client_id = NEW.id WHERE client_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE client_profiles SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE condition_flags SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE body_measurements SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE lab_results SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE medications SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE supplement_protocols SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE family_history SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE protocol_assignments SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    UPDATE scheduled_routines SET user_id = NEW.id WHERE user_id = (SELECT id FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id);
    DELETE FROM profiles WHERE email = lower(NEW.email) AND id != NEW.id;
  END IF;

  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, lower(NEW.email), COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO UPDATE SET
    email = lower(NEW.email),
    full_name = COALESCE(NULLIF(profiles.full_name, ''), NEW.raw_user_meta_data->>'full_name', '');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
