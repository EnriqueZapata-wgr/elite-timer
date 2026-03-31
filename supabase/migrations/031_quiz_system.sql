-- ============================================================
-- Migración 031: Sistema de quizzes + protocol_key
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

-- ═══ QUIZZES ═══

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'domain_specific',
  estimated_time_min INTEGER DEFAULT 5,
  domains TEXT[] NOT NULL,
  max_recommendations INTEGER DEFAULT 3,
  questions JSONB NOT NULL,
  protocol_mapping JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tier_required TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads quizzes" ON quizzes FOR SELECT USING (true);

-- ═══ RESPUESTAS ═══

CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  quiz_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  domain_scores JSONB NOT NULL,
  recommended_protocols TEXT[],
  accepted_protocols TEXT[],
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own responses" ON quiz_responses FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_quiz_responses_user ON quiz_responses(user_id);

-- ═══ PROTOCOL KEY ═══

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'protocol_templates' AND column_name = 'protocol_key') THEN
    ALTER TABLE protocol_templates ADD COLUMN protocol_key TEXT UNIQUE;
  END IF;
END $$;

-- Asignar keys a protocolos existentes
UPDATE protocol_templates SET protocol_key = 'protocolo_antiinflamatorio' WHERE name ILIKE '%anti-inflam%' AND protocol_key IS NULL;
UPDATE protocol_templates SET protocol_key = 'protocolo_optimizacion_hormonal' WHERE name ILIKE '%hormonal%' AND protocol_key IS NULL;
UPDATE protocol_templates SET protocol_key = 'protocolo_sueno_profundo' WHERE name ILIKE '%sueño%' AND protocol_key IS NULL;
UPDATE protocol_templates SET protocol_key = 'protocolo_metabolico_basico' WHERE name ILIKE '%metabólico%' AND protocol_key IS NULL;
