-- ============================================================
-- Migración 029: Sistema de protocolos extendido
-- EJECUTAR EN: Supabase SQL Editor
-- Extiende migración 003 con templates, user_protocols, daily_plans
-- ============================================================

-- ═══ PLANTILLAS DE PROTOCOLOS (reutilizables) ═══

CREATE TABLE IF NOT EXISTS protocol_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  tier INT CHECK (tier BETWEEN 1 AND 4),
  category TEXT,
  tags JSONB DEFAULT '[]',
  target_conditions JSONB DEFAULT '[]',
  phases JSONB DEFAULT '[]',
  default_actions JSONB NOT NULL DEFAULT '[]',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  duration_weeks INT DEFAULT 12,
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE protocol_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public templates visible" ON protocol_templates FOR SELECT USING (is_public = true);
CREATE POLICY "Creator manages templates" ON protocol_templates FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Coach clients see templates" ON protocol_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = protocol_templates.created_by AND client_id = auth.uid() AND status = 'active')
);

-- ═══ PROTOCOLOS ACTIVOS DEL USUARIO ═══

CREATE TABLE IF NOT EXISTS user_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  template_id UUID REFERENCES protocol_templates(id),
  assigned_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned')) DEFAULT 'active',
  current_phase INT DEFAULT 1,
  custom_actions JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  source TEXT CHECK (source IN ('coach', 'quiz', 'self', 'ai')) DEFAULT 'coach',
  source_quiz_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own protocols" ON user_protocols FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client protocols" ON user_protocols FOR ALL USING (
  auth.uid() = assigned_by OR
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = user_protocols.user_id AND status = 'active')
);

CREATE INDEX idx_user_protocols_active ON user_protocols(user_id, status) WHERE status = 'active';

-- ═══ PLAN DIARIO GENERADO ═══

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_protocols JSONB DEFAULT '[]',
  chronotype TEXT,
  actions JSONB NOT NULL DEFAULT '[]',
  total_actions INT DEFAULT 0,
  completed_actions INT DEFAULT 0,
  compliance_pct INT DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own plans" ON daily_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach sees client plans" ON daily_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients WHERE coach_id = auth.uid() AND client_id = daily_plans.user_id AND status = 'active')
);

CREATE INDEX idx_daily_plans_date ON daily_plans(user_id, date DESC);

-- ═══ BLOQUES DE ACCIONES RÁPIDAS ═══

CREATE TABLE IF NOT EXISTS action_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT,
  actions JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE action_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public blocks visible" ON action_blocks FOR SELECT USING (is_public = true);
CREATE POLICY "Creator manages blocks" ON action_blocks FOR ALL USING (auth.uid() = created_by);

-- ═══ EXTENDER QUIZ RESULTS ═══

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_results' AND column_name = 'recommended_protocols') THEN
    ALTER TABLE quiz_results ADD COLUMN recommended_protocols JSONB DEFAULT '[]';
  END IF;
END $$;
