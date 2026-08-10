/**
 * MB-32 · PIEZA 0 — el candado de escritura del día.
 *
 * daily_electrons guarda el día como UN blob jsonb: cada escritura lee el
 * mapa, mezcla y escribe entero. Dos escrituras concurrentes (el widget y la
 * app abierta, dos taps rápidos, un handler en frío) pueden borrarse entre
 * sí — es exactamente la corrupción por la que MB-30B dejó el botón de sol
 * fuera de las notificaciones (FIFO B6b).
 *
 * El candado son dos garantías, y las dos viven EN los escritores canónicos
 * (no en los callers, que es donde se olvidan):
 *
 *   1. SERIALIZACIÓN: toda escritura del día pasa por esta cadena de
 *      promesas. En Android la app, el widget y cualquier handler en frío
 *      comparten UN solo proceso y UN solo runtime de JS (el headless task
 *      reusa el ReactContext), así que encadenar aquí serializa de verdad:
 *      nunca hay dos leer-mezclar-escribir en vuelo.
 *
 *   2. LECTURA FRESCA: la base de la mezcla es lo que hay en la base EN ese
 *      momento, no el mapa que el caller compiló hace rato. Un mapa viejo ya
 *      no puede pisar lo que otro escribió en medio.
 *
 * Con las dos, persistBooleanToggle se vuelve el "writer atómico por-fuente"
 * que B6b esperaba: seguro desde la UI, desde el widget y desde un handler
 * en frío. (La atomicidad cross-DISPOSITIVO —dos teléfonos a la vez— exigiría
 * mezclar en el servidor; queda anotado en el FIFO, no es de este run.)
 */

let cadena: Promise<unknown> = Promise.resolve();

/**
 * Ejecuta `op` cuando terminen las escrituras del día en vuelo. El error de
 * un turno llega a SU caller y no envenena la cadena.
 */
export function conCandadoDelDia<T>(op: () => Promise<T>): Promise<T> {
  const turno = cadena.then(op, op);
  cadena = turno.then(
    () => undefined,
    () => undefined,
  );
  return turno;
}
