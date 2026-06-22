-- ============================================================================
-- 079 — HISTORIA CLÍNICA: cuestionarios de medicina funcional (T3 + HC5)
-- Una fila por usuario; `data` JSONB con las respuestas por categoría:
--   data = { padecimientos_personales: {q1: "yes", ...}, salud_bucal: {...}, ... }
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE — Enrique la corre con `npx supabase db push` (regla #12).
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS historia_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historia_clinica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own historia clinica" ON historia_clinica
  FOR ALL USING (auth.uid() = user_id);

-- Coach puede leer la de sus clientes activos (mismo patrón que lab_uploads 018/019).
CREATE POLICY "Coach reads client historia clinica" ON historia_clinica
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_id = auth.uid() AND client_id = historia_clinica.user_id AND status = 'active'
    )
  );
