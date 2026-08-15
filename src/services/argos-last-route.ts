/**
 * Dónde estaba parado el usuario antes de abrir a ARGOS.
 *
 * EL HUECO QUE TAPA: construirInyeccionPantalla sabe explicar las 192 pantallas
 * a partir de un pathname, pero nadie tenía el pathname a la mano. El chat solo
 * recibía el param `from`, que es uno de 9 pilares gruesos ("el usuario está en
 * Salud"), y solo cuando entraba por el botón flotante. Por cualquier otra vía
 * (tab de ARGOS, historial, un deep link) llegaba vacío y ARGOS no sabía nada.
 *
 * POR QUÉ UN SINGLETON Y NO UN CONTEXT: el consumidor es prepareChatTurn, que
 * es una función de servicio fuera del árbol de React. Un context obligaría a
 * pasar el dato a mano por cada caller, que es exactamente el olvido que ya
 * produjo el hueco (voice-conversation llama a generateResponseStream sin
 * screenContext y se queda igual de ciego).
 *
 * REGLA CLAVE: las rutas del propio ARGOS NO se registran. Si se registraran,
 * abrir el chat borraría la pantalla de la que vienes y la inyección diría "el
 * usuario está en ARGOS", que es cierto y es inútil.
 */
import { screenFromPath } from '@/src/hooks/argos-screen-context-core';

let ultimaRuta: string | null = null;

/** ¿Vale la pena recordar esta ruta como "de dónde vengo"? */
export function esRutaDeArgos(pathname: string | null | undefined): boolean {
  return screenFromPath(pathname) === 'argos';
}

/**
 * Registra la ruta actual. Idempotente y barato: se llama en cada cambio de
 * pantalla. Ignora las de ARGOS para no pisar el origen.
 */
export function registrarRuta(pathname: string | null | undefined): void {
  if (!pathname) return;
  if (esRutaDeArgos(pathname)) return;
  ultimaRuta = pathname;
}

/** La última pantalla real. `null` si el usuario abrió a ARGOS de arranque. */
export function ultimaRutaVisitada(): string | null {
  return ultimaRuta;
}

/** Solo para tests. */
export function _resetUltimaRuta(): void {
  ultimaRuta = null;
}
