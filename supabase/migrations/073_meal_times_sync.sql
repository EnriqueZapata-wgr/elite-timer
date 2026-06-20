-- 073_meal_times_sync.sql
-- Horarios de comida con sync entre dispositivos + timezone real del usuario.
-- Origen: decisión de Enrique sobre el flag #2 del Sprint 2+3 (horarios device-local).
--
-- ⚠️ NO EJECUTAR AUTOMÁTICAMENTE. Enrique la corre manual en Supabase SQL Editor
--    (regla #12 del CLAUDE.md). Idempotente (IF NOT EXISTS) — segura de re-correr.

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS meal_times JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS timezone  TEXT  DEFAULT NULL;

-- avatar_url para la foto de perfil (FIX 2). Solo se crea si no existe ya.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Forma de meal_times (JSONB):
-- {
--   "breakfast": { "start": "07:00", "end": "09:00" },
--   "snack_am":  { "start": "10:00", "end": "11:00" },
--   "lunch":     { "start": "13:00", "end": "15:00" },
--   "snack_pm":  { "start": "16:00", "end": "17:00" },
--   "dinner":    { "start": "19:00", "end": "21:00" }
-- }
--
-- timezone: string IANA, ej. "America/Mexico_City". Se aplica a hora LOCAL de cada
-- dispositivo, no UTC (5pm en CDMX ≠ 5pm en Madrid).
--
-- RLS: client_profiles y profiles ya tienen sus policies (no se añaden columnas-tabla
-- nuevas, solo columnas en tablas existentes → heredan las policies actuales).
