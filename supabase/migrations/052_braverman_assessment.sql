-- ============================================================
-- Migración 052: Test de Braverman — Evaluación de Neurotransmisores
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS braverman_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Parte 1: Dominancia (conteo de "Verdadero" por neurotransmisor)
  dominance_dopamine INTEGER DEFAULT 0,
  dominance_acetylcholine INTEGER DEFAULT 0,
  dominance_gaba INTEGER DEFAULT 0,
  dominance_serotonin INTEGER DEFAULT 0,
  dominant_type TEXT,

  -- Parte 2: Deficiencias
  deficiency_dopamine INTEGER DEFAULT 0,
  deficiency_acetylcholine INTEGER DEFAULT 0,
  deficiency_gaba INTEGER DEFAULT 0,
  deficiency_serotonin INTEGER DEFAULT 0,
  primary_deficiency TEXT,
  deficiency_level TEXT,

  -- Respuestas individuales
  responses JSONB DEFAULT '{}',

  -- Progreso (para retomar si no termina)
  current_part INTEGER DEFAULT 1,
  current_question INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE braverman_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own braverman_results" ON braverman_results
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_braverman_user ON braverman_results(user_id, created_at DESC);
