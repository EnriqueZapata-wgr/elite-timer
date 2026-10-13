/**
 * ¿La base ya tiene la 344? Memoria corta por sesión de la app.
 *
 * POR QUÉ EXISTE (revisión en frío, 13-oct-2026): mientras la 344 no esté en
 * producción, cada lector que pide columnas nuevas recibe un error de
 * columna faltante y reintenta con el select viejo. Sin memoria, eso es una
 * petición fallida de más en cada compilación del día, cada turno de ARGOS y
 * cada apertura de Sueño. Con esta bandera, el primer lector que lo descubre
 * avisa y los demás van directo al select viejo durante unos minutos.
 *
 * Caduca sola (TTL): cuando Enrique aplique la 344, la app la ve sin
 * reiniciarse. Nunca decide nada sobre los datos: solo ahorra un viaje.
 */

const TTL_MS = 10 * 60 * 1000;

let ausenteHasta = 0;

/** Un lector vio "columna de la 344 faltante". */
export function marcarBase344Ausente(ahoraMs: number = Date.now()): void {
  ausenteHasta = ahoraMs + TTL_MS;
}

/** ¿Saltarse el select nuevo e ir directo al viejo? */
export function base344ConocidaAusente(ahoraMs: number = Date.now()): boolean {
  return ahoraMs < ausenteHasta;
}

/** Solo para pruebas. */
export function _reiniciarBase344(): void {
  ausenteHasta = 0;
}
