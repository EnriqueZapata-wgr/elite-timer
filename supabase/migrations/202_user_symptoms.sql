-- 202: MIS SÍNTOMAS — modelo unificado de síntomas (Mega-Sprint B · B3).
--
-- Fusiona clinical_symptoms (por sistema · 152) + clinical_symptoms_aislados
-- (sueltos · 174) en UNA tabla con inicio/fin/duración (task #135). Doctrina:
-- un dato = un lugar.
--
-- CERO PÉRDIDA + REVERSIBILIDAD:
--   · Preserva los UUID originales (ON CONFLICT (id) DO NOTHING → idempotente).
--   · `source_kind` marca el origen ('sistema'|'aislado') → reconstruye los dos
--     conteos separados que el DX espera + permite revertir.
--   · NO se dropean las tablas viejas (soft-deprecation). clinical_symptoms +
--     clinical_symptom_logs + clinical_symptoms_aislados quedan dormidas un ciclo;
--     el DROP va en una migración posterior tras validar en device.
--   · Backfill filtra huérfanos (WHERE user_id IN auth.users) por doctrina.

CREATE TABLE IF NOT EXISTS user_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  severity INT NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  -- NULLABLE: los síntomas "sueltos" no tienen sistema. Los 7 sistemas de Mariana o NULL.
  system_key TEXT CHECK (system_key IS NULL OR system_key IN (
    'asimilacion','defensa','energia','biotransformacion',
    'transporte','comunicacion','estructura'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- inicio (task #135)
  resolved_at TIMESTAMPTZ,                        -- fin (NULL = activo)
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  -- Origen del backfill (reversibilidad + reconstrucción de conteos del DX).
  source_kind TEXT NOT NULL DEFAULT 'sistema' CHECK (source_kind IN ('sistema','aislado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_symptoms_user_active ON user_symptoms(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_symptoms_user_system ON user_symptoms(user_id, system_key);
CREATE INDEX IF NOT EXISTS idx_user_symptoms_user_started ON user_symptoms(user_id, started_at DESC);

ALTER TABLE user_symptoms ENABLE ROW LEVEL SECURITY;

-- RLS: dueño gestiona todo + coach lee (mismo patrón que 152/174).
DO $$ BEGIN
  CREATE POLICY user_symptoms_own ON user_symptoms
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY user_symptoms_coach_read ON user_symptoms
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM coach_clients cc
      WHERE cc.client_id = user_symptoms.user_id
        AND cc.coach_id = auth.uid()
        AND cc.status = 'active'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;
END $$;

-- ── Backfill (idempotente · preserva UUIDs · filtra huérfanos) ──────────────

-- Síntomas por sistema → source_kind 'sistema'. first_seen (DATE) es el mejor
-- proxy de inicio; si es NULL cae a created_at. status → is_active.
INSERT INTO user_symptoms
  (id, user_id, name, severity, system_key, started_at, resolved_at, is_active, note, source_kind, created_at, updated_at)
SELECT
  cs.id, cs.user_id, cs.name, cs.severity, cs.system_key,
  COALESCE(cs.first_seen::timestamptz, cs.created_at),
  cs.resolved_at,
  (cs.status = 'active'),
  cs.notes,
  'sistema',
  cs.created_at, cs.updated_at
FROM clinical_symptoms cs
WHERE cs.user_id IN (SELECT id FROM auth.users)
ON CONFLICT (id) DO NOTHING;

-- Síntomas sueltos → source_kind 'aislado'. tag→name, severity NULL→3 (default
-- histórico), sin sistema, siempre activos, logged_at es inicio+created.
INSERT INTO user_symptoms
  (id, user_id, name, severity, system_key, started_at, resolved_at, is_active, note, source_kind, created_at, updated_at)
SELECT
  ca.id, ca.user_id, ca.tag, COALESCE(ca.severity, 3), NULL,
  ca.logged_at, NULL, true, ca.note, 'aislado',
  ca.logged_at, ca.logged_at
FROM clinical_symptoms_aislados ca
WHERE ca.user_id IN (SELECT id FROM auth.users)
ON CONFLICT (id) DO NOTHING;
