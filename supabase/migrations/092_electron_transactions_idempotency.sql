-- 092_electron_transactions_idempotency.sql — Economía: idempotency ATÓMICA del award E-.
--
-- POR QUÉ: en 091, award_electrons chequeaba idempotency con un SELECT EXISTS sobre
-- metadata->>'idempotency_key' — race-prone: dos requests idénticos simultáneos podían pasar
-- el EXISTS antes de que cualquiera insertara → doble award. Aquí lo hacemos a prueba de
-- concurrencia con una columna + UNIQUE index parcial, y reescribimos award_electrons para
-- que la INSERCIÓN de la transacción sea la compuerta atómica (ON CONFLICT DO NOTHING):
-- el balance solo se acredita si la tx se insertó de verdad.
--
-- Idempotente. ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge.

ALTER TABLE electron_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Backfill: copiar la key que 091 guardaba en metadata (si existía) a la columna nueva,
-- para no romper idempotency de filas previas. Solo donde la columna está vacía.
UPDATE electron_transactions
  SET idempotency_key = metadata->>'idempotency_key'
  WHERE idempotency_key IS NULL AND metadata->>'idempotency_key' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_electron_tx_idempotency
  ON electron_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- award_electrons v2: idempotency atómica vía el UNIQUE index.
CREATE OR REPLACE FUNCTION award_electrons(
  p_user_id uuid, p_amount int, p_reason text,
  p_metadata jsonb DEFAULT NULL, p_idempotency_key text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted int;
BEGIN
  IF p_amount = 0 THEN RETURN; END IF;

  -- La tx es la compuerta: si la idempotency_key ya existe, ON CONFLICT no inserta.
  INSERT INTO electron_transactions (user_id, amount, reason, metadata, idempotency_key)
  VALUES (
    p_user_id, p_amount, p_reason,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', p_idempotency_key),
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  -- Retry idempotente (key ya existía) → NO acreditar balance.
  IF p_idempotency_key IS NOT NULL AND v_inserted = 0 THEN RETURN; END IF;

  -- Acreditar balance solo si la tx se insertó.
  INSERT INTO electron_balance (user_id, current_electrons, lifetime_electrons, current_rank, updated_at)
  VALUES (p_user_id, GREATEST(p_amount, 0), GREATEST(p_amount, 0),
          economy_rank_from_lifetime(GREATEST(p_amount, 0)), now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_electrons  = GREATEST(0, electron_balance.current_electrons + p_amount),
    lifetime_electrons = electron_balance.lifetime_electrons + GREATEST(p_amount, 0),
    current_rank       = economy_rank_from_lifetime(electron_balance.lifetime_electrons + GREATEST(p_amount, 0)),
    updated_at = now();
END; $$;

-- Permisos sin cambio (crédito solo service_role).
REVOKE ALL ON FUNCTION award_electrons(uuid, int, text, jsonb, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION award_electrons(uuid, int, text, jsonb, text) TO service_role;
