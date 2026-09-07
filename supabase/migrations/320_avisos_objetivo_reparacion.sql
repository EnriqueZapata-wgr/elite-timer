-- 320 · Avisos del objetivo: la marca de "lo apagó la persona" (7-sep-2026).
--
-- POR QUÉ EXISTE
-- aplicarPack enciende los avisos del objetivo con updateAppAviso. Si no hay
-- permiso de notificaciones, el paso quedaba en ok:false y NADIE lo
-- reintentaba: la persona concedía el permiso más tarde y sus avisos seguían
-- muertos, en silencio. El reconciliador nuevo (pack-avisos-service) reintenta
-- al abrir la app, y para hacerlo sin pisarle nada a nadie necesita distinguir
-- dos estados que hoy se parecen demasiado:
--
--   · SIN FILA en user_app_notification_prefs = nunca se encendió. La ficha
--     solo escribe fila cuando alguien toca el interruptor o su hora, y la
--     252 no hizo backfill: la ausencia de fila no es decisión de nadie.
--   · FILA con enabled = false = alguien la apagó.
--
-- El segundo caso se puede leer hoy por omisión, pero hay un hueco: en
-- app/journal.tsx el lápiz de la hora se puede tocar con el aviso APAGADO, y
-- eso escribe una fila enabled=false que nadie apagó nunca. Esta columna lo
-- vuelve explícito: la escribe updateAppAviso solo cuando el patch trae
-- `enabled`, o sea cuando alguien decidió de verdad.
--
-- EL ÚNICO BACKFILL, y va SOLO cuando la columna se crea. Antes de esta
-- columna, la única forma de que una fila llegara a enabled = false era que
-- alguien apagara el interruptor. Si esas filas nacieran con el DEFAULT
-- false, el reconciliador las leería como "nadie la apagó" y le reencendería
-- a esa persona un aviso que ella apagó: justo la línea que no se cruza. Por
-- eso las filas ya apagadas se marcan como suyas al momento de crear la
-- columna. No pisa nada: la fila sigue apagada, lo único que cambia es que
-- nadie la va a reencender por su cuenta. Hoy en producción son 0 filas (las
-- 4 que existen están en enabled = true).
--
-- Va dentro del IF de creación a propósito: correr el UPDATE en una segunda
-- pasada marcaría como "apagada por la persona" una fila apagada legítimamente
-- reparable, y la migración dejaría de ser idempotente en el sentido que
-- importa, que es el del dato.
--
-- Idempotente. Trae su BEGIN/COMMIT porque el CLI corre en autocommit
-- (ver CLAUDE.md).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_app_notification_prefs'
      AND column_name = 'apagado_por_usuario'
  ) THEN
    ALTER TABLE user_app_notification_prefs
      ADD COLUMN apagado_por_usuario BOOLEAN NOT NULL DEFAULT false;

    UPDATE user_app_notification_prefs
      SET apagado_por_usuario = true
      WHERE enabled = false;
  END IF;
END $$;

COMMENT ON COLUMN user_app_notification_prefs.apagado_por_usuario IS
  'true = la persona apagó este aviso a mano. El reconciliador de avisos del objetivo (pack-avisos-service) jamás lo vuelve a encender. false/ausencia de fila = nunca se encendió, y sí se puede reparar.';

COMMIT;

NOTIFY pgrst, 'reload schema';
