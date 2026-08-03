-- ============================================================================
-- 248 — REPARAR checkin EN user_day_preferences (bug Mariana M1, 2026-08-03)
--
-- Causa raíz: el DEFAULT de active_boolean_electrons (043) son los 6 booleanos
-- originales, SIN 'checkin'. Cualquier fila creada por escritores inocentes
-- (backfill 063, meta de agua, meta de ayuno, quitar evento de agenda) nace
-- sin checkin, y como la lista persistida GANA sobre DEFAULT_BOOLEANS en
-- day-compiler y checkin no era seleccionable ni MANDATORY, la card del
-- check-in quedaba apagada para siempre aunque los electrones se acreditaran.
--
-- Dos partes, ambas idempotentes:
--   1. Reparar toda fila existente que no tenga 'checkin' (sin duplicar, sin
--      tocar el resto de la lista).
--   2. Corregir el DEFAULT de la columna para que las filas nuevas nazcan
--      bien (protege a los binarios viejos, que siguen creando filas con el
--      DEFAULT de la columna).
--
-- En el cliente, checkin entra a MANDATORY_BOOLEANS (misma red que journal/
-- cardio) — esta migración repara a quien el binario viejo ya rompió.
-- ============================================================================

UPDATE user_day_preferences
SET active_boolean_electrons = active_boolean_electrons || ARRAY['checkin'],
    updated_at = NOW()
WHERE active_boolean_electrons IS NOT NULL
  AND NOT ('checkin' = ANY(active_boolean_electrons));

ALTER TABLE user_day_preferences
  ALTER COLUMN active_boolean_electrons
  SET DEFAULT ARRAY['sunlight','meditation','supplements','cold_shower','grounding','no_alcohol','checkin'];
