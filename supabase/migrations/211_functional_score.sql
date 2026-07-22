-- 211: ATP Functional Score (Sprint Compliance 4, decisión §4.2).
-- El scanner deja de emitir veredicto binario BHA (approved/rejected) y pasa a
-- score numérico 0-100 por atributos. Columna nueva; bha_status queda como
-- legado de lectura (scans históricos) — CERO borrado de datos del user.
-- El action_key del cobro H+ sigue siendo 'bha_scan' (interno, no user-facing;
-- renombrarlo requeriría tocar proton_action_costs + argos-proxy en deploy
-- coordinado — decisión documentada en el delivery).
-- Idempotente.

ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS functional_score INTEGER
  CHECK (functional_score >= 0 AND functional_score <= 100);

COMMENT ON COLUMN user_supplements.functional_score IS
  'ATP Functional Score 0-100 (promedio de atributos de formulación). Privado al usuario. Reemplaza el binario bha_status.';
