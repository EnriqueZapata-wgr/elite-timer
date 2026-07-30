-- MB-13 · PIEZA 6 — Recargas de H+ como consumibles IAP
--
-- La acreditación es SERVER-SIDE: award_protons está revocada al cliente
-- (anti-minteo, migración 091) y el teléfono nunca acredita. El webhook de
-- RevenueCat llama credit_hplus_purchase con service_role.
-- Idempotente por transaction_id: los webhooks se reintentan y un pago no
-- puede dar dos veces los H+. La compuerta es el unique index de
-- proton_transactions.idempotency_key (migración 094).
-- Idempotente.

-- ── 1) Mapeo product id de tienda → pack ─────────────────────────────────
-- Por convención el product id en App Store / Play Console ES el sku
-- (h_plus_small / h_plus_medium / h_plus_large); la columna permite
-- divergir si una tienda obliga otro id.
ALTER TABLE proton_packages ADD COLUMN IF NOT EXISTS store_product_id TEXT;
UPDATE proton_packages SET store_product_id = sku WHERE store_product_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_proton_packages_store_product
  ON proton_packages(store_product_id) WHERE store_product_id IS NOT NULL;

-- ── 2) Acreditación idempotente ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_hplus_purchase(
  p_user_id UUID,
  p_product_id TEXT,
  p_transaction_id TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg RECORD;
  v_key TEXT;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_transaction_id, '') = '' THEN
    RETURN jsonb_build_object('credited', false, 'error', 'invalid_args');
  END IF;

  SELECT sku, protons INTO v_pkg
  FROM proton_packages
  WHERE store_product_id = p_product_id OR sku = p_product_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('credited', false, 'error', 'unknown_product');
  END IF;

  v_key := 'iap_' || p_transaction_id;

  -- La transacción del ledger ES la compuerta: si el idempotency_key ya
  -- existe, este pago ya acreditó y no se repite.
  BEGIN
    INSERT INTO proton_transactions (user_id, amount, type, action_key, metadata, idempotency_key)
    VALUES (
      p_user_id,
      v_pkg.protons,
      'package_purchase',
      'iap_' || v_pkg.sku,
      COALESCE(p_metadata, '{}'::jsonb)
        || jsonb_build_object('product_id', p_product_id, 'transaction_id', p_transaction_id),
      v_key
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('credited', false, 'error', 'duplicate_transaction');
  END;

  INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, updated_at)
  VALUES (p_user_id, v_pkg.protons, v_pkg.protons, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_protons = proton_balance.current_protons + EXCLUDED.current_protons,
    lifetime_earned = proton_balance.lifetime_earned + EXCLUDED.lifetime_earned,
    updated_at = NOW();

  RETURN jsonb_build_object('credited', true, 'protons', v_pkg.protons, 'sku', v_pkg.sku);
END;
$$;

-- Solo el servidor acredita. El teléfono nunca.
REVOKE ALL ON FUNCTION credit_hplus_purchase(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION credit_hplus_purchase(UUID, TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION credit_hplus_purchase(UUID, TEXT, TEXT, JSONB) IS
  'MB-13 — acredita un pack H+ comprado como consumible IAP. Idempotente por transaction_id vía proton_transactions.idempotency_key. Solo service_role (webhook RevenueCat / reclaim-hplus).';
