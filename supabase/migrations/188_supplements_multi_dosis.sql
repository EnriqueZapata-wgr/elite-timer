-- ============================================================================
-- 188 — Multi-dosis por día (Vit C 3×día = 1 suplemento con 3 tomas).
-- Sprint SUPS+BHA, Bloque 4. Rango Fable 150-199.
--
--   user_supplements.dose_times TEXT[] — etiquetas de toma ('mañana','comida',
--     'tarde','noche') u horas HH:MM. NULL o 1 elemento = 1 toma/día (legacy).
--     N elementos = N checks diarios. Complementa (no reemplaza) dose_pattern
--     de 167: dose_pattern = frecuencia semanal, dose_times = tomas intra-día.
--
--   supplement_logs.dose_index SMALLINT — qué toma del día es este log (0-based).
--     DEFAULT 0 → toda la data existente queda como "primera toma" sin backfill.
--
-- EVOLUCIÓN DEL UNIQUE (investigado en 055):
--   055 creó el constraint inline UNIQUE(user_id, supplement_id, date) →
--   nombre por convención Postgres: supplement_logs_user_id_supplement_id_date_key.
--   Con multi-dosis ese unique impide >1 log/día → se evoluciona a
--   (user_id, supplement_id, date, dose_index) SIN tocar data:
--     1. crear el índice único nuevo (si la data actual violara el nuevo unique
--        no puede — dose_index es columna nueva con DEFAULT 0 y el viejo unique
--        garantiza 1 fila por (user,supp,date)),
--     2. dropear el constraint viejo con IF EXISTS.
--
-- ⚠️ COMPAT CLIENTES VIEJOS: el JS anterior hace upsert con
--   onConflict 'user_id,supplement_id,date' — tras dropear ese constraint el
--   upsert de un binario/bundle viejo falla (PostgREST exige un índice que
--   matchee las columnas del ON CONFLICT). Aplicar esta migración JUNTO con el
--   OTA de este sprint (el JS nuevo usa onConflict con dose_index). Ventana de
--   riesgo mínima en beta (5-9 testers) y el toggle degrada a error silencioso
--   logueado, no crash.
--
-- RLS ya existe en ambas tablas (055). Idempotente.
-- ⚠️ NO aplicar al remoto desde la rama — Enrique corre `npx supabase db push`
--    tras el merge (regla #12).
-- ============================================================================

ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS dose_times TEXT[];

ALTER TABLE supplement_logs ADD COLUMN IF NOT EXISTS dose_index SMALLINT NOT NULL DEFAULT 0;

-- 1) Índice único nuevo (user, supp, date, dose_index)
CREATE UNIQUE INDEX IF NOT EXISTS supplement_logs_user_supp_date_dose_key
  ON supplement_logs(user_id, supplement_id, date, dose_index);

-- 2) Dropear el unique viejo de 055 (1 fila por user+supp+día)
ALTER TABLE supplement_logs
  DROP CONSTRAINT IF EXISTS supplement_logs_user_id_supplement_id_date_key;
