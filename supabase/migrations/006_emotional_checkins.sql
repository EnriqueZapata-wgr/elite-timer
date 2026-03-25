-- ============================================================
-- Migración: Check-ins emocionales
-- PENDIENTE: Ejecutar manualmente en Supabase SQL Editor
-- ============================================================

CREATE TABLE emotional_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  quadrant TEXT CHECK (quadrant IN ('high_pleasant', 'high_unpleasant', 'low_pleasant', 'low_unpleasant')) NOT NULL,
  emotions TEXT[] NOT NULL,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
  pleasantness INT CHECK (pleasantness BETWEEN 1 AND 10),
  context_where TEXT,
  context_who TEXT,
  context_doing TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE emotional_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own checkins" ON emotional_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach reads client checkins" ON emotional_checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = emotional_checkins.user_id AND status = 'active')
);

CREATE INDEX idx_checkins_user_date ON emotional_checkins(user_id, created_at);

-- Agregar 'emotional_checkin' como link_type válido en protocol_items
ALTER TABLE protocol_items DROP CONSTRAINT IF EXISTS protocol_items_link_type_check;
ALTER TABLE protocol_items ADD CONSTRAINT protocol_items_link_type_check CHECK (
  link_type IN ('routine', 'timer', 'breathing', 'meditation', 'meal_photo', 'supplement_check',
    'fasting_window', 'journal', 'habit_check', 'external_link', 'info', 'emotional_checkin', NULL)
);

-- Agregar 2 check-ins al protocolo demo
INSERT INTO protocol_items (protocol_id, sort_order, scheduled_time, duration_minutes, category, title, description, accent_color, link_type)
VALUES
  ('dddddddd-0001-0001-0001-000000000001', 0, '05:25', 1, 'mind', 'Check-in matutino', '¿Cómo despiertas hoy? Registra tu estado emocional.', '#7F77DD', 'emotional_checkin'),
  ('dddddddd-0001-0001-0001-000000000001', 19, '21:15', 1, 'mind', 'Check-in nocturno', '¿Cómo terminas el día? Registra antes de dormir.', '#7F77DD', 'emotional_checkin');
