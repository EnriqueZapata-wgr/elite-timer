-- ============================================================
-- Migración: assign_routine_to_client + RLS coach para rutinas
-- ============================================================

-- Coach puede ver rutinas de sus clientes
CREATE POLICY "Coach reads client routines" ON routines FOR SELECT
USING (creator_id = auth.uid() OR EXISTS (
  SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = routines.creator_id AND status = 'active'
));

-- Coach puede ver scheduled_routines de sus clientes
CREATE POLICY "Coach reads client schedules" ON scheduled_routines FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = scheduled_routines.user_id AND status = 'active'
));

-- Función: asignar rutina de coach a cliente
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
  -- Verificar relación coach-cliente
  IF NOT EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = p_coach_id AND client_id = p_client_id AND status = 'active') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Clonar rutina al cliente
  SELECT clone_routine(p_routine_id, p_client_id) INTO v_new_routine_id;

  -- Marcar como asignada por coach
  UPDATE routines SET original_creator_id = p_coach_id WHERE id = v_new_routine_id;

  -- Programar en calendario del cliente
  INSERT INTO scheduled_routines (user_id, routine_id, assigned_by, schedule_type, day_of_week, specific_date)
  VALUES (p_client_id, v_new_routine_id, p_coach_id, p_schedule_type, p_day_of_week, p_specific_date);

  RETURN v_new_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
