-- Task #114 fase A — Privacy compliance foundation (GDPR + LFPDPP + Apple/Google)
-- Cowork range: 100-149.
-- Aplicada en remoto Supabase 2026-07-06 vía MCP execute_sql.
-- Idempotente: puede reaplicarse sin efectos secundarios.

-- 1) User Consent — toggles granulares que el user controla desde Settings > Privacidad
CREATE TABLE IF NOT EXISTS user_consent (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_posthog BOOLEAN NOT NULL DEFAULT true,
  argos_persistent_memory BOOLEAN NOT NULL DEFAULT true,
  marketing_communications BOOLEAN NOT NULL DEFAULT false,
  share_anonymized_research BOOLEAN NOT NULL DEFAULT false,
  share_with_clinician BOOLEAN NOT NULL DEFAULT true,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  privacy_accepted_at TIMESTAMPTZ,
  privacy_version TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_consent_select" ON user_consent;
CREATE POLICY "own_consent_select" ON user_consent FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_consent_insert" ON user_consent;
CREATE POLICY "own_consent_insert" ON user_consent FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_consent_update" ON user_consent;
CREATE POLICY "own_consent_update" ON user_consent FOR UPDATE USING (auth.uid() = user_id);

-- 2) Data Export Requests — DSAR (GDPR Art. 20 portabilidad)
CREATE TABLE IF NOT EXISTS user_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  file_size_bytes INTEGER,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_data_exports_user ON user_data_exports(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_exports_status ON user_data_exports(status) WHERE status IN ('pending', 'processing');

ALTER TABLE user_data_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_exports_select" ON user_data_exports;
CREATE POLICY "own_exports_select" ON user_data_exports FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_exports_insert" ON user_data_exports;
CREATE POLICY "own_exports_insert" ON user_data_exports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) Account Deletion Requests — GDPR Art. 17 "derecho al olvido" con soft delete + 30d grace
CREATE TABLE IF NOT EXISTS user_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_delete_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancelled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'processed', 'failed')),
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_deletion_requests_scheduled ON user_deletion_requests(scheduled_delete_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_deletion_requests_active ON user_deletion_requests(user_id) WHERE status = 'pending';

ALTER TABLE user_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_deletion_select" ON user_deletion_requests;
CREATE POLICY "own_deletion_select" ON user_deletion_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_deletion_insert" ON user_deletion_requests;
CREATE POLICY "own_deletion_insert" ON user_deletion_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_deletion_update" ON user_deletion_requests;
CREATE POLICY "own_deletion_update" ON user_deletion_requests FOR UPDATE USING (auth.uid() = user_id);

-- 4) Data Access Audit Log — GDPR Art. 5(1)(f) accountability + tracking accesos internos
CREATE TABLE IF NOT EXISTS user_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accessor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accessor_role TEXT NOT NULL,
  access_type TEXT NOT NULL,
  resource TEXT NOT NULL,
  reason TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_data_access_log_target ON user_data_access_log(target_user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_access_log_accessor ON user_data_access_log(accessor_user_id, accessed_at DESC) WHERE accessor_user_id IS NOT NULL;

ALTER TABLE user_data_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "target_can_view_access_log" ON user_data_access_log;
CREATE POLICY "target_can_view_access_log" ON user_data_access_log FOR SELECT USING (auth.uid() = target_user_id);

-- Trigger helper: touch updated_at en user_consent
CREATE OR REPLACE FUNCTION touch_user_consent_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_consent_touch ON user_consent;
CREATE TRIGGER trg_user_consent_touch BEFORE UPDATE ON user_consent
  FOR EACH ROW EXECUTE FUNCTION touch_user_consent_updated_at();

COMMENT ON TABLE user_consent IS 'Toggles granulares de consent per user. GDPR + LFPDPP compliance.';
COMMENT ON TABLE user_data_exports IS 'Requests de export de datos (GDPR Art. 20). Estado async con expiración de URLs.';
COMMENT ON TABLE user_deletion_requests IS 'Requests de eliminación de cuenta (GDPR Art. 17). Soft delete 30 días.';
COMMENT ON TABLE user_data_access_log IS 'Audit log de accesos. Compliance + trazabilidad.';
