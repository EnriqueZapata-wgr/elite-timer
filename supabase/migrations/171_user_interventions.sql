-- ============================================================================
-- 171 — USER_INTERVENTIONS (estado del user con cada intervención = "Mi Protocolo").
-- Rango Fable 150-199. Depende de 170 (source_dx_id).
--
-- La suma de status='active' es "Mi Protocolo" (nombre de vitrina). SIN LÍMITE
-- de cuántas puede activar (doctrina). El motor sugiere (status='suggested');
-- el user activa libremente.
--
-- Intervenciones del CATÁLOGO curado → intervention_key apunta a
-- src/constants/interventions-catalog.ts. Intervenciones CUSTOM del user →
-- is_custom=true, intervention_key='custom_<uuid>' (generado en cliente con
-- generateUUID), y la definición vive en custom_definition JSONB (nunca en el
-- catálogo). Las custom nacen 'active' por decisión del user; el motor NO las
-- sugiere en v1.
--
-- UNIVERSALES (fallback + circadianos): is_universal=true. Los circadianos
-- (dormir/comer) traen computed_time calculado desde user_chronotype en
-- intervention-engine-core.ts. Van al mismo pipeline HOY/AGENDA.
--
-- Idempotente. RLS: dueño full + coach lectura.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_key TEXT NOT NULL,            -- key de catálogo | 'custom_<uuid>'
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'active', 'paused', 'dismissed')),
  priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),  -- 1🔴 2🟡 3🟢
  source_dx_id UUID REFERENCES functional_dx(id) ON DELETE SET NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  is_universal BOOLEAN NOT NULL DEFAULT false,
  -- custom_definition: { name, how, benefit, categories[], roots[] } (raíces/cat opcionales)
  custom_definition JSONB,
  custom_time TEXT,        -- HH:MM override del user
  computed_time TEXT,      -- HH:MM calculado por cronotipo (universales circadianos)
  custom_notes TEXT,
  custom_dose TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, intervention_key),
  -- si es custom, debe traer definición
  CONSTRAINT custom_needs_definition CHECK (NOT is_custom OR custom_definition IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_interventions_user_status
  ON user_interventions (user_id, status, priority);

ALTER TABLE user_interventions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own interventions" ON user_interventions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Coach reads client interventions" ON user_interventions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM coach_clients
        WHERE coach_id = auth.uid() AND client_id = user_interventions.user_id AND status = 'active'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
