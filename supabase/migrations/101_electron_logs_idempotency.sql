-- ============================================================
-- Migración 101 (#v13i CAPA C): idempotencia de electron_logs.
--
-- POR QUÉ: doble-tap rápido en una card booleana de HOY (supplements, luz solar…)
-- creaba 2 filas en electron_logs — la compuerta era check-then-insert (SELECT count
-- + INSERT), no atómica: dos requests en carrera veían count=0 y ambos insertaban.
-- Mismo patrón que proton_transactions (094): la key determinística (user:source:date)
-- va en la columna y el UNIQUE index parcial dedupica atómicamente.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS.
-- ⚠️ Aplicar vía MCP execute_sql (NO apply_migration — bug wrapper de tracking).
-- ============================================================

ALTER TABLE electron_logs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_electron_logs_idempotency
  ON electron_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

NOTIFY pgrst, 'reload schema';
