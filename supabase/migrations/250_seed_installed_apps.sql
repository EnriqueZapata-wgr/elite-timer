-- 250 · MB-22.1 Pieza 2 — nadie pierde apps de su cuadrícula.
--
-- MB-22 hizo que la sala ATP liste SOLO lo instalado. Ocho apps no tienen
-- ningún electrón (rachas, movilidad, rm, records, recetas, lista-compra,
-- labs, protocolos) y otras pueden tener su toggle apagado (respirar, nback,
-- entrenar, sueño, ayuno, glucosa, cetonas): al aplicar el OTA desaparecerían
-- de la sala de TODOS los usuarios actuales, sin aviso.
--
-- Regla: **a quien ya tiene la app, no se le quita nada.** Se siembra
-- installed_apps con TODO lo que hoy es visible (las 23 llaves sin gate;
-- ciclo va aparte en la 251 porque su visibilidad depende del sexo, y
-- ajustes es fija en código — FIXED_APPS — y no necesita fila).
--
-- La limpieza es para quien empieza de cero: los usuarios creados DESPUÉS de
-- este push no se tocan aquí — su set inicial lo pone el cliente.
--
-- Idempotente:
--   · UPDATE solo toca filas a las que les falta alguna llave (@> las salta).
--   · INSERT solo crea filas para usuarios que no tienen ninguna. Las
--     columnas restantes toman su DEFAULT (043 + 248), que produce EXACTAMENTE
--     el mismo HOY que la ausencia de fila: booleanos default(7) ∪ MANDATORY
--     == DEFAULT_BOOLEANS(10) ∪ MANDATORY, y en quants steps/sleep se filtran
--     en day-compiler, así que default(protein,steps,water) == (protein,water).
--     Cero cambio de comportamiento en TAREAS.

DO $$
DECLARE
  seed TEXT[] := ARRAY[
    'meditar','respirar','emociones','journal','sueno','nback','rachas',
    'entrenar','cardio','movilidad','rm','records',
    'comida','hidratacion','ayuno','suplementos','recetas','lista-compra',
    'sol','glucosa','cetonas','labs','protocolos'
  ];
BEGIN
  -- 1 · Usuarios con fila: unión sin duplicar, sin tocar lo que ya eligieron.
  UPDATE user_day_preferences
  SET installed_apps = (
        SELECT COALESCE(array_agg(DISTINCT k), '{}')
        FROM unnest(COALESCE(installed_apps, '{}') || seed) AS k
      ),
      updated_at = NOW()
  WHERE NOT (COALESCE(installed_apps, '{}') @> seed);

  -- 2 · Usuarios SIN fila (nunca escribieron prefs): también estaban adentro
  --     y también veían toda la sala. Fila nueva solo con la siembra.
  INSERT INTO user_day_preferences (user_id, installed_apps)
  SELECT u.id, seed
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_day_preferences p WHERE p.user_id = u.id
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;

NOTIFY pgrst, 'reload schema';
