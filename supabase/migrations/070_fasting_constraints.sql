-- Migration 070: Fasting logs constraint alignment + partial unique
-- Step AYUNO REWRITE — alinea CHECK con el código + permite múltiples completed por día.
-- Enrique corre manualmente en Supabase SQL Editor (regla #12).

BEGIN;

-- ========================================
-- 1. Limpieza de datos previos
-- ========================================

-- Convertir 'broken' (si existe en datos antiguos) a 'cancelled'.
UPDATE fasting_logs SET status = 'cancelled' WHERE status = 'broken';

-- Si hay múltiples filas 'active' por user (no debería pero por si acaso),
-- mantener solo la más reciente, marcar las otras como 'cancelled'.
WITH ranked AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY fast_start DESC) AS rn
  FROM fasting_logs
  WHERE status = 'active'
)
UPDATE fasting_logs
SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ========================================
-- 2. CHECK constraint alineado al código
-- ========================================

ALTER TABLE fasting_logs DROP CONSTRAINT IF EXISTS fasting_logs_status_check;
ALTER TABLE fasting_logs ADD CONSTRAINT fasting_logs_status_check
  CHECK (status IN ('active', 'completed', 'cancelled'));

-- ========================================
-- 3. UNIQUE constraint refinado: solo un active por user
-- ========================================

-- Drop el viejo UNIQUE(user_id, date) — permitía solo 1 fast por día calendario.
ALTER TABLE fasting_logs DROP CONSTRAINT IF EXISTS fasting_logs_user_id_date_key;

-- Nuevo: solo 1 active por user (sin importar día). Múltiples completed/cancelled OK.
CREATE UNIQUE INDEX IF NOT EXISTS fasting_logs_one_active_per_user
  ON fasting_logs (user_id) WHERE status = 'active';

COMMIT;
