-- ============================================================
-- Migración: assign_routine_to_client
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION assign_routine_to_client(
  p_coach_id UUID,
  p_client_id UUID,
  p_routine_id UUID,
  p_schedule_type TEXT,
  p_day_of_week INT DEFAULT NULL,
  p_specific_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_routine_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = p_coach_id AND client_id = p_client_id AND status = 'active') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT clone_routine(p_routine_id, p_client_id) INTO v_new_routine_id;
  UPDATE routines SET original_creator_id = p_coach_id WHERE id = v_new_routine_id;
  INSERT INTO scheduled_routines (user_id, routine_id, assigned_by, schedule_type, day_of_week, specific_date)
  VALUES (p_client_id, v_new_routine_id, p_coach_id, p_schedule_type, p_day_of_week, p_specific_date);
  RETURN v_new_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
