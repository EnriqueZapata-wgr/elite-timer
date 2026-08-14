/**
 * lab-nuevos-store — qué parámetros acaban de entrar, para que ATP Labs los
 * pueda resaltar al aterrizar.
 *
 * OLA6 PIEZA C. El flujo de labs era un círculo: Mi Salud sube, confirmación
 * guarda y devuelve a Mi Salud, que no muestra los valores. El usuario nunca
 * veía el resultado de lo que acababa de hacer. Ahora la confirmación aterriza
 * en ATP Labs con `?nuevo=N`, y esta caja dice CUÁLES son esos N.
 *
 * Por qué no van en los params: el conteo sirve para el aviso, pero las claves
 * pueden ser cuarenta y no caben en una URL. Mismo patrón que lab-review-store
 * (memoria de la sesión JS): `router.replace` no reinicia el bundle, así que
 * la lista sigue viva al aterrizar. Si por lo que sea no está, Labs solo pierde
 * el resaltado: nunca miente ni inventa filas.
 *
 * Se consume UNA vez (`takeNuevos`): el resaltado es del aterrizaje, no un
 * estado que persiga al usuario por la app.
 */

let pendientes: string[] = [];

/** Guarda las claves canónicas recién confirmadas. */
export function setNuevos(keys: string[]): void {
  pendientes = [...new Set(keys)];
}

/** Devuelve las claves pendientes y vacía la caja. */
export function takeNuevos(): string[] {
  const out = pendientes;
  pendientes = [];
  return out;
}

/** Solo para tests: deja la caja como recién arrancada. */
export function resetNuevos(): void {
  pendientes = [];
}
