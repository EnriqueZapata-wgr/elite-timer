-- MB-13 · PIEZA 3 — Eventos crudos del webhook de pago web (Stripe/Conekta)
--
-- Cada POST del proveedor se guarda aquí ANTES de procesarse. El índice
-- único (provider, event_id) es la compuerta de idempotencia: los
-- proveedores reintentan y un cobro no puede dar dos meses.
-- Cuando algo se caiga, raw_payload es la única forma de saber qué pasó.
-- Idempotente.

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'conekta')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- Correo del checkout: el amarre con la cuenta pasa por aquí.
  email TEXT,
  -- Cuenta amarrada, si el correo coincidió con un perfil existente.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Código de activación generado para este pago, si aplica.
  activation_code_id UUID REFERENCES activation_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'skipped', 'needs_review', 'error')),
  -- 'sent' | 'pending_manual' (sin RESEND_API_KEY) | 'failed' | NULL (no aplica)
  email_status TEXT CHECK (email_status IN ('sent', 'pending_manual', 'failed')),
  error TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Compuerta de idempotencia: el mismo evento reintentado no se procesa dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_unique
  ON payment_webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status
  ON payment_webhook_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_email
  ON payment_webhook_events(email);

-- RLS sin policies: tabla operativa del servidor, ningún usuario la lee.
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payment_webhook_events IS
  'MB-13 — payload crudo de cada webhook de pago web (Stripe/Conekta). Idempotencia por (provider, event_id). Solo service_role.';
