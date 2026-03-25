-- ============================================================
-- Migración: Sistema de Protocolo Diario
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

-- Protocolos diarios (template del día completo)
CREATE TABLE daily_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator manages own protocols" ON daily_protocols FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY "Assigned users can read" ON daily_protocols FOR SELECT USING (
  EXISTS (SELECT 1 FROM protocol_assignments WHERE protocol_id = daily_protocols.id AND user_id = auth.uid() AND is_active = true)
);

-- Items dentro del protocolo
CREATE TABLE protocol_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES daily_protocols(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INT,
  category TEXT CHECK (category IN ('fitness', 'nutrition', 'supplements', 'habits', 'recovery', 'mind', 'sleep')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link_type TEXT CHECK (link_type IN ('routine', 'timer', 'breathing', 'meditation', 'meal_photo', 'supplement_check', 'fasting_window', 'journal', 'habit_check', 'external_link', 'info', NULL)),
  link_routine_id UUID REFERENCES routines(id),
  link_url TEXT,
  accent_color TEXT DEFAULT '#a8e02a',
  notify BOOLEAN DEFAULT false,
  notify_minutes_before INT DEFAULT 0,
  notify_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE protocol_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access via protocol" ON protocol_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM daily_protocols WHERE id = protocol_items.protocol_id AND (
    creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM protocol_assignments WHERE protocol_id = daily_protocols.id AND user_id = auth.uid() AND is_active = true)
  ))
);
CREATE POLICY "Creator manages items" ON protocol_items FOR ALL USING (
  EXISTS (SELECT 1 FROM daily_protocols WHERE id = protocol_items.protocol_id AND creator_id = auth.uid())
);

-- Asignación de protocolo a usuario
CREATE TABLE protocol_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES daily_protocols(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active_until DATE,
  applies_monday BOOLEAN DEFAULT true,
  applies_tuesday BOOLEAN DEFAULT true,
  applies_wednesday BOOLEAN DEFAULT true,
  applies_thursday BOOLEAN DEFAULT true,
  applies_friday BOOLEAN DEFAULT true,
  applies_saturday BOOLEAN DEFAULT true,
  applies_sunday BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE protocol_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own assignments" ON protocol_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coach manages assignments" ON protocol_assignments FOR ALL USING (auth.uid() = assigned_by);

-- Completions (tracking de checks)
CREATE TABLE protocol_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  protocol_item_id UUID REFERENCES protocol_items(id) NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  photo_url TEXT,
  notes TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  wearable_data JSONB,
  UNIQUE(user_id, protocol_item_id, completion_date)
);

ALTER TABLE protocol_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own completions" ON protocol_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach reads client completions" ON protocol_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = protocol_completions.user_id AND status = 'active')
);

-- Índices
CREATE INDEX idx_protocol_items_protocol ON protocol_items(protocol_id);
CREATE INDEX idx_protocol_assignments_user ON protocol_assignments(user_id);
CREATE INDEX idx_protocol_completions_user_date ON protocol_completions(user_id, completion_date);

-- Función: obtener timeline de hoy
CREATE OR REPLACE FUNCTION get_today_timeline(p_user_id UUID)
RETURNS TABLE (
  item_id UUID,
  protocol_name TEXT,
  scheduled_time TIME,
  duration_minutes INT,
  category TEXT,
  title TEXT,
  description TEXT,
  accent_color TEXT,
  link_type TEXT,
  link_routine_id UUID,
  link_url TEXT,
  is_completed BOOLEAN,
  completed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_dow INT;
BEGIN
  v_dow := EXTRACT(DOW FROM CURRENT_DATE)::INT;

  RETURN QUERY
  SELECT
    pi.id AS item_id,
    dp.name AS protocol_name,
    pi.scheduled_time,
    pi.duration_minutes,
    pi.category,
    pi.title,
    pi.description,
    pi.accent_color,
    pi.link_type,
    pi.link_routine_id,
    pi.link_url,
    (pc.id IS NOT NULL) AS is_completed,
    pc.completed_at
  FROM protocol_assignments pa
  JOIN daily_protocols dp ON dp.id = pa.protocol_id
  JOIN protocol_items pi ON pi.protocol_id = dp.id
  LEFT JOIN protocol_completions pc ON pc.protocol_item_id = pi.id
    AND pc.user_id = p_user_id
    AND pc.completion_date = CURRENT_DATE
  WHERE pa.user_id = p_user_id
    AND pa.is_active = true
    AND (pa.active_from <= CURRENT_DATE)
    AND (pa.active_until IS NULL OR pa.active_until >= CURRENT_DATE)
    AND (
      (v_dow = 0 AND pa.applies_sunday) OR
      (v_dow = 1 AND pa.applies_monday) OR
      (v_dow = 2 AND pa.applies_tuesday) OR
      (v_dow = 3 AND pa.applies_wednesday) OR
      (v_dow = 4 AND pa.applies_thursday) OR
      (v_dow = 5 AND pa.applies_friday) OR
      (v_dow = 6 AND pa.applies_saturday)
    )
  ORDER BY pi.scheduled_time, pi.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: toggle completion
CREATE OR REPLACE FUNCTION toggle_protocol_completion(p_user_id UUID, p_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM protocol_completions
    WHERE user_id = p_user_id AND protocol_item_id = p_item_id AND completion_date = CURRENT_DATE
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM protocol_completions
    WHERE user_id = p_user_id AND protocol_item_id = p_item_id AND completion_date = CURRENT_DATE;
    RETURN false;
  ELSE
    INSERT INTO protocol_completions (user_id, protocol_item_id, completion_date)
    VALUES (p_user_id, p_item_id, CURRENT_DATE);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
