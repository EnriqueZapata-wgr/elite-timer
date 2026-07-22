-- 210: Parámetros de seguridad + log de atestaciones (Sprint Compliance 3).
--
-- A) safety_params: umbrales clínicos BORRADOR (fiebre, ayuno, respiración,
--    condiciones bloqueadas por familia de protocolo). Mariana los confirma
--    como CONTENIDO en paralelo — por eso viven en tabla: se ajustan con un
--    UPDATE, sin re-deploy ni OTA. El cliente los lee con fallback a
--    defaults compilados (fail-safe si no hay red).
-- B) user_attestation_log: cada atestación palomeada (capa 5 del sign-off) —
--    evidencia de asunción informada del riesgo. Append-only, ip/user_agent
--    estampados por el trigger de la migración 209.
-- Idempotente.

-- ── A · safety_params ──
CREATE TABLE IF NOT EXISTS safety_params (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE safety_params ENABLE ROW LEVEL SECURITY;

-- Lectura para usuarios autenticados; escritura solo service_role (dashboard/SQL).
DROP POLICY IF EXISTS "safety_params_read_all" ON safety_params;
CREATE POLICY "safety_params_read_all" ON safety_params
  FOR SELECT TO authenticated USING (true);

-- Seeds (umbrales BORRADOR del HANDOFF_DEV_CIERRE_COMPLIANCE_2026-07-21).
INSERT INTO safety_params (key, value) VALUES
  ('fever_screening', '{
    "tempThresholdC": 39,
    "durationThresholdHours": 48,
    "redFlags": ["rigidez_nuca", "dificultad_respiratoria", "confusion", "sarpullido_no_blanquea", "convulsion"],
    "pregnancyTriggers": true
  }'::jsonb),
  ('fasting_safety', '{
    "advisoryHours": 36,
    "strongAlertHours": 72,
    "autoCloseHours": 120,
    "attestationThresholdHours": 48,
    "pregnancyMaxHours": 12,
    "blockedConditions": ["diabetes_tipo_1", "diabetes_tipo_2", "tca"]
  }'::jsonb),
  ('breath_limits', '{
    "maxGuidedRounds": 3,
    "maxRetentionSeconds": 90
  }'::jsonb),
  ('protocol_gate', '{
    "families": {
      "breath_intense": {
        "keys": ["wim_hof_basico", "wim_hof_extendido", "tabla_co2", "tabla_o2", "hiperventilacion_matutina"],
        "breathingTemplates": ["wim-hof-lite", "energize-2"],
        "blockedConditions": ["epilepsia", "cardiopatia", "hipertension", "sincopes"],
        "pregnancyBlocks": true
      },
      "cold": {
        "keys": ["ducha_fria_nivel1", "ducha_fria_nivel2", "ducha_fria_nivel3", "bano_frio_desinflamacion", "cold_plunge_cns", "bano_frio_hormesis", "dive_reflex_cara_hielo", "terapia_contraste"],
        "blockedConditions": ["cardiopatia", "hipertension"],
        "pregnancyBlocks": true
      },
      "heat": {
        "keys": ["sauna_infrarrojo", "sauna_finlandesa", "sauna_vapor", "bano_caliente_vespertino"],
        "blockedConditions": ["cardiopatia"],
        "pregnancyBlocks": true
      },
      "fasting_protocol": {
        "keys": ["ayuno_16_8", "ayuno_20_4_omad", "protocolo_ayuno_sardinas", "ejercicio_ayuno_fuerza"],
        "blockedConditions": ["diabetes_tipo_1", "diabetes_tipo_2", "tca"],
        "pregnancyBlocks": true
      }
    }
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── B · user_attestation_log ──
CREATE TABLE IF NOT EXISTS user_attestation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attestation_id TEXT NOT NULL,     -- 'wim_hof' | 'cold' | 'heat' | 'fasting_48h'
  protocol_key TEXT,                -- key del catálogo / template / protocolo de ayuno
  texto_version TEXT NOT NULL,
  texto_hash TEXT NOT NULL,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- momento en el dispositivo
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_attestation_log_user
  ON user_attestation_log (user_id, attestation_id, created_at DESC);

ALTER TABLE user_attestation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attestation_log_insert_own" ON user_attestation_log;
CREATE POLICY "attestation_log_insert_own" ON user_attestation_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attestation_log_select_own" ON user_attestation_log;
CREATE POLICY "attestation_log_select_own" ON user_attestation_log
  FOR SELECT USING (auth.uid() = user_id);

-- Sin UPDATE/DELETE: evidencia inmutable.

-- Reusa la función de estampado de la migración 209 (ip + user_agent).
DROP TRIGGER IF EXISTS trg_attestation_log_stamp ON user_attestation_log;
CREATE TRIGGER trg_attestation_log_stamp
  BEFORE INSERT ON user_attestation_log
  FOR EACH ROW EXECUTE FUNCTION consent_log_stamp_request_meta();
