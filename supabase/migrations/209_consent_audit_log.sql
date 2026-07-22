-- 209: Log de auditoría de consentimiento (Sprint Compliance 2).
-- Registra cada aceptación/revocación de los checkboxes CB-1..CB-7 del
-- AVISO_DE_PRIVACIDAD_v1 (Parte 3) con: user_id, timestamp, ip, aviso_version,
-- texto_hash, checkbox_id. Append-only: el usuario puede insertar y leer sus
-- filas, nunca actualizarlas ni borrarlas (evidencia de consentimiento).
-- La IP y el user-agent se estampan SERVER-SIDE por trigger leyendo los headers
-- de PostgREST (el cliente RN no conoce su propia IP pública).
-- Idempotente.

CREATE TABLE IF NOT EXISTS user_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkbox_id TEXT NOT NULL CHECK (checkbox_id IN ('CB-1','CB-2','CB-3','CB-4','CB-5','CB-6','CB-7')),
  action TEXT NOT NULL DEFAULT 'accepted' CHECK (action IN ('accepted','revoked')),
  aviso_version TEXT NOT NULL,
  terms_version TEXT,
  texto_hash TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- momento en el dispositivo
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()   -- momento en el servidor
);

CREATE INDEX IF NOT EXISTS idx_user_consent_log_user_cb
  ON user_consent_log (user_id, checkbox_id, created_at DESC);

ALTER TABLE user_consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_log_insert_own" ON user_consent_log;
CREATE POLICY "consent_log_insert_own" ON user_consent_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "consent_log_select_own" ON user_consent_log;
CREATE POLICY "consent_log_select_own" ON user_consent_log
  FOR SELECT USING (auth.uid() = user_id);

-- Sin policies de UPDATE/DELETE: el log es inmutable para el usuario.

-- Estampa ip + user_agent desde los headers del request PostgREST.
-- x-forwarded-for puede traer lista "cliente, proxy1, proxy2" → tomar el primero.
CREATE OR REPLACE FUNCTION consent_log_stamp_request_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  headers JSONB;
  fwd TEXT;
BEGIN
  BEGIN
    headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    headers := NULL;
  END;
  IF headers IS NOT NULL THEN
    fwd := split_part(COALESCE(headers->>'x-forwarded-for', ''), ',', 1);
    IF fwd <> '' THEN
      BEGIN
        NEW.ip := trim(fwd)::inet;
      EXCEPTION WHEN OTHERS THEN
        NEW.ip := NULL;
      END;
    END IF;
    NEW.user_agent := left(headers->>'user-agent', 512);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_log_stamp ON user_consent_log;
CREATE TRIGGER trg_consent_log_stamp
  BEFORE INSERT ON user_consent_log
  FOR EACH ROW EXECUTE FUNCTION consent_log_stamp_request_meta();
