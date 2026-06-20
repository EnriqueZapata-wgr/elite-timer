-- ARGOS Logs — extender con target_user_id y target_profile_id
-- para soportar flujo coach (caller paga, beneficiario puede diferir).
--
-- Semántica:
--   user_id           = quien paga la llamada (auth.uid del caller)
--   target_user_id    = cliente CON cuenta ATP (cuando coach usa ARGOS para él)
--   target_profile_id = paciente SIN cuenta ATP (shadow profile en client_profiles)
--
-- Reglas:
--   - Self-use: user_id = X, ambos target_* NULL
--   - Coach + cliente ATP: user_id = coach, target_user_id = client_auth_id
--   - Coach + shadow: user_id = coach, target_profile_id = client_profile_id
--   - target_user_id y target_profile_id son mutuamente excluyentes
--     (no constraint duro por ahora — disciplina en código)

ALTER TABLE argos_logs
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_profile_id uuid REFERENCES client_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_argos_logs_target_user_date
  ON argos_logs(target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_argos_logs_target_profile_date
  ON argos_logs(target_profile_id, created_at DESC)
  WHERE target_profile_id IS NOT NULL;

COMMENT ON COLUMN argos_logs.user_id IS 'Caller — paga la llamada (auth.uid del que dispara)';
COMMENT ON COLUMN argos_logs.target_user_id IS 'Cliente ATP cuando coach usa ARGOS para él. NULL si self-use o shadow.';
COMMENT ON COLUMN argos_logs.target_profile_id IS 'Shadow profile sin cuenta ATP. NULL si self-use o cliente ATP.';
