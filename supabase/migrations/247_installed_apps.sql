-- 247 · MB-20 Pieza 3 — instalar = activar el hábito: la persistencia.
--
-- Las apps instalables SIN electrón activable (ayuno por eventos, sueño sin
-- fuente, glucosa/cetonas por registro) necesitan recordar su instalación.
-- Preferimos user_day_preferences (ya existe, RLS de 043 "Users own
-- day_prefs" FOR ALL cubre la columna nueva) antes que tabla nueva.
--
-- Idempotente. Patrón espejo de 098:70-72 (columna + NOTIFY).
--
-- ⚠️ Estado del remoto: verificar ANTES del push que 238 (entry_gate) y 245
-- (body_zone) ya están aplicadas (checkin-service degrada con retry de
-- columna fantasma, señal de que pueden no estarlo):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'emotional_checkins';
--
-- El cliente tolera la ausencia de esta columna (install-service reintenta
-- el upsert sin ella), pero el db push va ANTES del OTA como siempre.

ALTER TABLE user_day_preferences ADD COLUMN IF NOT EXISTS installed_apps TEXT[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
