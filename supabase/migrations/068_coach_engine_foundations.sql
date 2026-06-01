-- Migration 068: Coach Engine Foundations
-- Step COACH (PRD §6.12) — 14 tablas del brief metodología §11.5
-- Enrique ejecuta manualmente en Supabase SQL Editor.

BEGIN;

-- ========================================
-- 1. coach_voice_config (output del onboarding de voice)
-- ========================================
CREATE TABLE IF NOT EXISTS coach_voice_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone TEXT DEFAULT 'cercano_profesional',
  formality_level INT CHECK (formality_level BETWEEN 1 AND 10),
  emotional_distance INT CHECK (emotional_distance BETWEEN 1 AND 10),
  vocabulary_preference TEXT,
  commitment_level INT CHECK (commitment_level BETWEEN 1 AND 10),
  experience_level INT CHECK (experience_level BETWEEN 1 AND 10),
  self_assessment_capacity INT CHECK (self_assessment_capacity BETWEEN 1 AND 10),
  language_default TEXT DEFAULT 'es',
  derived_from_onboarding BOOLEAN DEFAULT FALSE,
  last_recalibrated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE coach_voice_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_config_select_own" ON coach_voice_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "voice_config_insert_own" ON coach_voice_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_config_update_own" ON coach_voice_config FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 2. goal_blueprints (objetivo declarado + avatar)
-- ========================================
CREATE TABLE IF NOT EXISTS goal_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  goal_description TEXT,
  avatar_description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goal_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_blueprints_select_own" ON goal_blueprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goal_blueprints_insert_own" ON goal_blueprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_blueprints_update_own" ON goal_blueprints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goal_blueprints_delete_own" ON goal_blueprints FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 3. goal_tree_nodes (árbol de habilidades)
-- ========================================
CREATE TABLE IF NOT EXISTS goal_tree_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES goal_blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES goal_tree_nodes(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  measurable_attribute TEXT,
  applicable_principle TEXT,
  stop_criterion_met BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goal_tree_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_tree_nodes_select_own" ON goal_tree_nodes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goal_tree_nodes_insert_own" ON goal_tree_nodes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_tree_nodes_update_own" ON goal_tree_nodes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goal_tree_nodes_delete_own" ON goal_tree_nodes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_goal_tree_nodes_blueprint ON goal_tree_nodes(blueprint_id, level);
CREATE INDEX IF NOT EXISTS idx_goal_tree_nodes_parent ON goal_tree_nodes(parent_id);

-- ========================================
-- 4. node_curves (3 curvas con márgenes móviles por nodo)
-- ========================================
CREATE TABLE IF NOT EXISTS node_curves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES goal_tree_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_curve JSONB,
  lower_limit_curve JSONB,
  upper_limit_curve JSONB,
  last_recalibrated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(node_id)
);
ALTER TABLE node_curves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "node_curves_select_own" ON node_curves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "node_curves_insert_own" ON node_curves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "node_curves_update_own" ON node_curves FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 5. node_measurements (mediciones puntuales por nodo)
-- ========================================
CREATE TABLE IF NOT EXISTS node_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES goal_tree_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC,
  unit TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE node_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "node_measurements_select_own" ON node_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "node_measurements_insert_own" ON node_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_node_measurements_node_user_date ON node_measurements(node_id, user_id, measured_at DESC);

-- ========================================
-- 6. red_flag_events (banderas rojas con flag_index acumulado + ciclo de vida)
-- ========================================
CREATE TABLE IF NOT EXISTS red_flag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'sistemica_aguda', 'dolor_alarma', 'cronico_degenerativa',
    'marcador_fisiologico_clinico', 'salud_mental', 'otra'
  )),
  severity TEXT CHECK (severity IN ('emergencia', 'alta', 'media', 'baja')),
  evidence_text TEXT,
  derivation_emitted BOOLEAN DEFAULT FALSE,
  derivation_type TEXT,
  client_response TEXT CHECK (client_response IN ('atendio', 'ignoro', 'pendiente', 'resuelto')),
  flag_index INT DEFAULT 1,
  lifecycle_phase TEXT DEFAULT 'active' CHECK (lifecycle_phase IN ('active', 'en_seguimiento', 'silente')),
  resolved_at TIMESTAMPTZ,
  resolution_documented TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE red_flag_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "red_flag_events_select_own" ON red_flag_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "red_flag_events_insert_own" ON red_flag_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "red_flag_events_update_own" ON red_flag_events FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_events_user_active ON red_flag_events(user_id, lifecycle_phase, created_at DESC);

-- ========================================
-- 7. derivations (seguimiento de derivaciones a especialistas)
-- ========================================
CREATE TABLE IF NOT EXISTS derivations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  red_flag_event_id UUID REFERENCES red_flag_events(id) ON DELETE SET NULL,
  specialist_type TEXT,
  immediate_actions JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'attended', 'resolved', 'ignored')),
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE derivations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "derivations_select_own" ON derivations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "derivations_insert_own" ON derivations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "derivations_update_own" ON derivations FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 8. intervention_logs (auditabilidad: qué intervino el coach + razonamiento)
-- ========================================
CREATE TABLE IF NOT EXISTS intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  question_1_result TEXT CHECK (question_1_result IN ('sabe', 'no_sabe', NULL)),
  question_2_result TEXT CHECK (question_2_result IN ('verde', 'amarillo', 'rojo', NULL)),
  cascade_level INT CHECK (cascade_level BETWEEN 1 AND 5),
  principle_invoked TEXT,
  brake_detected TEXT,
  intervention_text TEXT,
  audit_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE intervention_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intervention_logs_select_own" ON intervention_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "intervention_logs_insert_own" ON intervention_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_user_date ON intervention_logs(user_id, created_at DESC);

-- ========================================
-- 9. frenos_log (frenos detectados con dominante)
-- ========================================
CREATE TABLE IF NOT EXISTS frenos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brake_type TEXT CHECK (brake_type IN ('no_saber', 'miedo', 'energia_biologica', 'apatia')),
  is_dominant BOOLEAN DEFAULT FALSE,
  evidence_text TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE frenos_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frenos_log_select_own" ON frenos_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "frenos_log_insert_own" ON frenos_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "frenos_log_update_own" ON frenos_log FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 10. aceleradores_state (estándar declarado + sistema construido)
-- ========================================
CREATE TABLE IF NOT EXISTS aceleradores_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  standard_declared TEXT,
  system_components JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE aceleradores_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aceleradores_state_select_own" ON aceleradores_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "aceleradores_state_insert_own" ON aceleradores_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aceleradores_state_update_own" ON aceleradores_state FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 11. coach_insights (outputs del coach para UI — briefings, alerts, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('chat', 'briefing', 'post_action', 'weekly_review', 'alert')),
  content TEXT NOT NULL,
  ui_payload JSONB,
  triggered_by TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_insights_select_own" ON coach_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach_insights_insert_own" ON coach_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_insights_update_own" ON coach_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_coach_insights_user_active ON coach_insights(user_id, dismissed_at NULLS FIRST, created_at DESC);

-- ========================================
-- 12. subjective_reports (pareja subjetivo/objetivo para EWMA)
-- ========================================
CREATE TABLE IF NOT EXISTS subjective_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subjective_metric TEXT,
  subjective_value NUMERIC,
  objective_metric TEXT,
  objective_value NUMERIC,
  discrepancy NUMERIC,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subjective_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjective_reports_select_own" ON subjective_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subjective_reports_insert_own" ON subjective_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_subjective_reports_user_date ON subjective_reports(user_id, reported_at DESC);

-- ========================================
-- 13. evidence_catalog (claims con nivel de evidencia — SHARED, no RLS)
-- ========================================
CREATE TABLE IF NOT EXISTS evidence_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim TEXT NOT NULL,
  level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  mechanism_evidence TEXT,
  human_evidence TEXT,
  source_refs JSONB,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- evidence_catalog es contenido curado compartido — SELECT público para authenticated.
ALTER TABLE evidence_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_catalog_select_all" ON evidence_catalog FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE/DELETE restringidos a service_role (admin curado, no usuarios).
CREATE INDEX IF NOT EXISTS idx_evidence_catalog_category_level ON evidence_catalog(category, level);

-- ========================================
-- 14. principle_invocations (log de qué principio invocó el coach)
-- ========================================
CREATE TABLE IF NOT EXISTS principle_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  principle TEXT NOT NULL CHECK (principle IN (
    'fisiologia', 'biomecanica', 'mecanismos_biologicos',
    'identidad', 'proposito', 'filosofia', 'estandar', 'contexto'
  )),
  context_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE principle_invocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "principle_invocations_select_own" ON principle_invocations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "principle_invocations_insert_own" ON principle_invocations FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMIT;
