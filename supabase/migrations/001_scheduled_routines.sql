-- ============================================================
-- Migración: Tabla scheduled_routines + función get_today_routines
-- Permite programar rutinas en ciclo semanal o fecha específica.
-- ============================================================

-- Tabla de rutinas programadas (calendario)
CREATE TABLE scheduled_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  routine_id UUID REFERENCES routines(id) NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  schedule_type TEXT CHECK (schedule_type IN ('weekly_cycle', 'specific_date')) NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  specific_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (schedule_type = 'weekly_cycle' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (schedule_type = 'specific_date' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- RLS
ALTER TABLE scheduled_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own schedule" ON scheduled_routines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own schedule" ON scheduled_routines
  FOR ALL USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_scheduled_routines_user ON scheduled_routines(user_id);
CREATE INDEX idx_scheduled_routines_date ON scheduled_routines(specific_date);
CREATE INDEX idx_scheduled_routines_day ON scheduled_routines(day_of_week);

-- ============================================================
-- Función: get_today_routines
-- Devuelve las rutinas programadas para hoy (por día de semana o fecha).
-- DOW de PostgreSQL: 0=domingo, 1=lunes ... 6=sábado
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_routines(p_user_id UUID)
RETURNS TABLE (
  routine_id UUID,
  routine_name TEXT,
  routine_mode TEXT,
  schedule_type TEXT,
  assigned_by UUID,
  assigned_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (sr.routine_id)
    sr.routine_id,
    r.name AS routine_name,
    r.mode AS routine_mode,
    sr.schedule_type,
    sr.assigned_by,
    p.full_name AS assigned_by_name
  FROM scheduled_routines sr
  JOIN routines r ON r.id = sr.routine_id
  LEFT JOIN profiles p ON p.id = sr.assigned_by
  WHERE sr.user_id = p_user_id
    AND sr.is_active = true
    AND (
      (sr.schedule_type = 'specific_date' AND sr.specific_date = CURRENT_DATE)
      OR
      (sr.schedule_type = 'weekly_cycle' AND sr.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INT)
    )
  ORDER BY sr.routine_id, sr.schedule_type ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
