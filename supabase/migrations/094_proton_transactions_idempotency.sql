-- 094_proton_transactions_idempotency.sql — Economía: idempotency ATÓMICA del gasto H+.
--
-- POR QUÉ: 22-jun 8:16pm Enrique mandó 1 mensaje a ARGOS y el server cobró 2× (280 H+ ×2 =
-- 560 H+) con 42ms de diferencia — race condition: el cliente disparó 2 requests (doble tap /
-- retry / re-render React) y `spend_protons` (091) debitó dos veces porque no tenía compuerta
-- de idempotencia. Réplica EXACTA del patrón de 092 (award_electrons) pero para el GASTO:
-- la INSERCIÓN de la transacción es la compuerta atómica (ON CONFLICT DO NOTHING) y el balance
-- solo se debita si la tx se insertó de verdad.
--
-- La idempotency_key viaja DENTRO de p_metadata (`{ "idempotency_key": "<uuid>" }`) — la firma
-- de spend_protons NO cambia (mismo args) → CREATE OR REPLACE preserva los permisos existentes.
--
-- Idempotente. ⚠️ NO ejecutar aquí — `npx supabase db push` post-merge (Enrique audita primero).

ALTER TABLE proton_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Backfill defensivo: si alguna fila previa guardó la key en metadata, cópiala a la columna.
UPDATE proton_transactions
  SET idempotency_key = metadata->>'idempotency_key'
  WHERE idempotency_key IS NULL AND metadata->>'idempotency_key' IS NOT NULL;

-- Compuerta atómica de idempotencia (sirve también de índice de lookup rápido).
CREATE UNIQUE INDEX IF NOT EXISTS idx_proton_tx_idempotency
  ON proton_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- spend_protons v2: idempotencia atómica vía el UNIQUE index. Misma firma que 091.
CREATE OR REPLACE FUNCTION spend_protons(
  p_user_id uuid, p_amount bigint, p_action_key text, p_metadata jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance bigint;
  v_idem text := p_metadata->>'idempotency_key';
  v_inserted int;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_amount'); END IF;

  -- (1) Retry idempotente: si esta key YA cobró, devolver success SIN volver a debitar.
  -- Se chequea ANTES del insufficient-check porque tras el primer cobro el balance pudo
  -- bajar — un retry legítimo no debe leerse como "fondos insuficientes".
  IF v_idem IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM proton_transactions WHERE idempotency_key = v_idem) THEN
      SELECT current_protons INTO v_balance FROM proton_balance WHERE user_id = p_user_id;
      RETURN jsonb_build_object('success', true, 'new_balance', COALESCE(v_balance, 0), 'idempotent', true);
    END IF;
  END IF;

  -- (2) Lock + balance check.
  SELECT current_protons INTO v_balance FROM proton_balance WHERE user_id = p_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'new_balance', v_balance, 'error', 'insufficient_protons');
  END IF;

  -- (3) La tx es la compuerta atómica: dos requests con la MISMA key → solo uno inserta.
  INSERT INTO proton_transactions (user_id, amount, type, action_key, metadata, idempotency_key)
  VALUES (p_user_id, -p_amount, 'action_spent', p_action_key, p_metadata, v_idem)
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  -- Perdió la carrera (otro request concurrente insertó primero) → NO debitar de nuevo.
  IF v_idem IS NOT NULL AND v_inserted = 0 THEN
    RETURN jsonb_build_object('success', true, 'new_balance', v_balance, 'idempotent', true);
  END IF;

  -- (4) Debitar balance SOLO si la tx se insertó.
  UPDATE proton_balance SET current_protons = current_protons - p_amount,
    lifetime_spent = lifetime_spent + p_amount, updated_at = now() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
END; $$;
