-- 259 · MB-29 Pieza 3 — Edad ATP entra al set inicial de la cuadrícula.
--
-- Los 9 destinos de SALUD se vuelven apps instalables desde el Centro
-- (APP_REGISTRY, mismo camino de installed_apps de la mig 247). No hay
-- tabla nueva: la columna installed_apps vive en user_day_preferences y su
-- RLS es la de 043 ("Users own day_prefs" FOR ALL), que cubre esta siembra.
--
-- Solo `edad-atp` se siembra: es el gancho y queda a un toque. Las otras
-- ocho se instalan desde el Centro quien las quiera. Nadie pierde acceso:
-- las puertas de salud-puertas siguen llegando a los 9 destinos igual que
-- hoy (hay test que lo cementa).
--
-- Usuarios NUEVOS no pasan por aquí: su set inicial lo pone el cliente
-- (initialSeedApps, que ya incluye edad-atp). Esta siembra es para quien
-- ya existe, con el patrón idempotente de la 250:
--   · UPDATE solo toca filas a las que les falta la llave (@> las salta).
--   · INSERT solo crea filas para usuarios sin ninguna; el resto de
--     columnas toma su DEFAULT (043 + 248), que produce el mismo HOY que
--     la ausencia de fila. Cero cambio de comportamiento en TAREAS.

DO $$
DECLARE
  seed TEXT[] := ARRAY['edad-atp'];
BEGIN
  -- 1 · Usuarios con fila: unión sin duplicar, sin tocar lo que eligieron.
  UPDATE user_day_preferences
  SET installed_apps = (
        SELECT COALESCE(array_agg(DISTINCT k), '{}')
        FROM unnest(COALESCE(installed_apps, '{}') || seed) AS k
      ),
      updated_at = NOW()
  WHERE NOT (COALESCE(installed_apps, '{}') @> seed);

  -- 2 · Usuarios SIN fila: también deben ver Edad ATP a un toque.
  INSERT INTO user_day_preferences (user_id, installed_apps)
  SELECT u.id, seed
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_day_preferences p WHERE p.user_id = u.id
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;

NOTIFY pgrst, 'reload schema';
