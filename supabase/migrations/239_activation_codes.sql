-- MB-13 · PIEZA 1 — Códigos de activación (puente de pago)
-- El canje pasa por RPC SECURITY DEFINER: el usuario NUNCA lee esta tabla
-- (un usuario que pueda listar códigos, los canjea todos). Idempotente.
-- Aplicar vía MCP execute_sql (patrón del repo), no apply_migration.

CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Formato legible en voz alta: ATP-XXXX-XXXX, alfabeto sin 0/O ni 1/I/L.
  code TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('base', 'pro', 'clinician')),
  -- NULL = tier sin vencimiento.
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  -- Vencimiento del código, distinto del vencimiento del tier que otorga.
  expires_at TIMESTAMPTZ,
  -- 'web_payment' lo usa PIEZA 3: código de un uso atado a un pago web.
  source TEXT NOT NULL CHECK (source IN ('founder', 'afiliado', 'cortesia', 'soporte', 'web_payment')),
  issued_to_email TEXT,
  redeemed_by UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La gente teclea el código con o sin guiones y en cualquier caja: la
-- unicidad y la búsqueda operan sobre la forma normalizada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_codes_normalized
  ON activation_codes (regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'));

-- RLS sin policies de usuario: SELECT autenticado devuelve vacío.
-- service_role (webhooks, admin RPC) bypasea RLS.
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- ── RPC de canje ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_activation_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_norm TEXT;
  v_row activation_codes%ROWTYPE;
  v_new_expires TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated');
  END IF;

  v_norm := regexp_replace(upper(COALESCE(p_code, '')), '[^A-Z0-9]', '', 'g');
  IF v_norm = '' THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- FOR UPDATE: dos canjes simultáneos del mismo código se serializan y el
  -- contador nunca rebasa max_uses.
  SELECT * INTO v_row
  FROM activation_codes
  WHERE regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_norm
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Antes que vencido/agotado: quien ya lo canjeó necesita oír eso.
  IF v_row.redeemed_by @> ARRAY[v_user] THEN
    RETURN jsonb_build_object('status', 'already_redeemed', 'tier', v_row.tier);
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('status', 'exhausted');
  END IF;

  v_new_expires := CASE
    WHEN v_row.duration_days IS NULL THEN NULL
    ELSE NOW() + make_interval(days => v_row.duration_days)
  END;

  -- Tier + consumo del código en la misma transacción (la función lo es).
  UPDATE profiles
  SET tier = v_row.tier, tier_expires_at = v_new_expires
  WHERE id = v_user;

  UPDATE activation_codes
  SET used_count = used_count + 1,
      redeemed_by = redeemed_by || v_user
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'tier', v_row.tier,
    'expires_at', v_new_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION redeem_activation_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_activation_code(TEXT) TO authenticated, service_role;

COMMENT ON TABLE activation_codes IS
  'MB-13 — códigos de activación de tier (founders, afiliados, cortesías, soporte, pagos web). Sin lectura de usuario: canje solo vía redeem_activation_code.';
COMMENT ON FUNCTION redeem_activation_code(TEXT) IS
  'MB-13 — canjea un código (normaliza, valida vigencia/usos/recanje) y aplica tier + tier_expires_at al perfil del solicitante. Resultado tipado: ok / not_found / expired / exhausted / already_redeemed.';
