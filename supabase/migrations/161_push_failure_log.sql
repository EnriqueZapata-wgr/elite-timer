-- 161_push_failure_log.sql — Dead-letter de push tokens (Sprint #50 T2)
-- Rango Fable: 158-199.
--
-- Registra fallos de Expo Push por token. Con 3+ fallos DeviceNotRegistered
-- el dispatch v7 auto-invalida el token (DELETE en user_notification_tokens).
-- Solo service_role lee/escribe: RLS ON sin policies para authenticated.

CREATE TABLE IF NOT EXISTS push_failure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT,
  bucket_key TEXT,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_push_failure_user_time ON push_failure_log(user_id, failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_failure_token ON push_failure_log(expo_push_token);

ALTER TABLE push_failure_log ENABLE ROW LEVEL SECURITY;
-- Sin policies: authenticated no ve nada; service_role (edge function) bypassa RLS.

COMMENT ON TABLE push_failure_log IS
  'Sprint #50 — dead-letter de Expo Push. 3+ DeviceNotRegistered → token auto-invalidado.';
