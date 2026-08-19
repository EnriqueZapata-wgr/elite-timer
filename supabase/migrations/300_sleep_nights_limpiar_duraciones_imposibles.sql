-- 300_sleep_nights_limpiar_duraciones_imposibles.sql
--
-- PROPUESTA. No aplicada. Decide el dueño (ver R and D/SLEEP_DIAGNOSTICO.md).
--
-- Qué pasó: nochesDesdeTramos SUMABA los tramos de sueño en vez de medir su
-- UNIÓN. Las dos plataformas entregan el mismo rato dormido más de una vez
-- (Health Connect devuelve una SleepSession por cada app que escribe; Salud
-- de Apple entrega el tramo "dormido" completo y encima los tramos por tipo),
-- así que la misma noche se contaba dos y tres veces. En producción quedaron
-- noches de 1,440 minutos (24 h, el techo del CHECK) sobre camas de 9 h.
--
-- La suma ya se corrigió en src/services/sleep/sleep-import-core.ts, pero las
-- filas que ya se escribieron NO se arreglan solas: el import nunca pisa una
-- noche existente (ON CONFLICT DO NOTHING) y ese candado se respeta. Sin
-- borrarlas, un re-import las deja igual de mentirosas para siempre.
--
-- Qué borra, con criterio conservador:
--   · SOLO filas importadas (health_connect / healthkit). Las noches medidas
--     por el usuario con su Sleep Cycle NO SE TOCAN: dato de persona es
--     sagrado, dato de máquina se revalida.
--   · SOLO filas cuya duración es MATEMÁTICAMENTE IMPOSIBLE: dormiste más de
--     lo que estuviste en cama. No hay juicio ni umbral inventado: si
--     duration_minutes excede el rato entre bed_time y wake_time, es basura.
--   · Nada más. Una noche importada creíble se queda donde está.
--
-- Borrar y no corregir es a propósito: la duración correcta no se puede
-- recalcular aquí (los tramos crudos nunca se guardaron, solo el total). La
-- fila borrada se vuelve a importar bien desde la pantalla de Sueño con el
-- código ya corregido. Poner un número inventado sería peor que no tenerlo.
--
-- Idempotente: correrla dos veces no borra de más (la segunda no encuentra
-- ninguna fila que cumpla la condición).

DELETE FROM sleep_nights
WHERE source IN ('health_connect', 'healthkit')
  AND bed_time IS NOT NULL
  AND wake_time IS NOT NULL
  AND duration_minutes IS NOT NULL
  AND duration_minutes > CEIL(EXTRACT(EPOCH FROM (wake_time - bed_time)) / 60.0);
