/**
 * Singleton del audio largo de Mente — UN solo sonido vivo en toda la app.
 *
 * MB-28C P1: B8 (2026-08-02) puso el singleton dentro de app/mente/player.tsx,
 * pero el kill del player anterior quedaba ANTES de un await
 * (loadMenteAudioPrefs): dos cargas concurrentes (doble tap → doble push del
 * modal) veían ambas el singleton vacío y nacían dos audios empalmados, con
 * los controles de la pantalla visible mandando solo sobre uno.
 *
 * Este módulo saca el estado a un lugar único y testeable (Vitest node-only,
 * sin render RN):
 *  - `claimActivePlayer` descarga al anterior y toma el lugar en el MISMO
 *    paso síncrono — no existe ventana entre kill y create.
 *  - La generación de carga invalida cargas viejas en vuelo: si otra carga
 *    arrancó después, la anterior se vuelve obsoleta y no crea ni navega.
 *  - `stopActivePlayer` es el botón de parar que siempre está: apaga lo que
 *    suene aunque la pantalla haya perdido su referencia.
 *
 * Solo audio LARGO (piezas del catálogo). Los cues cortos (sounds.ts) y la
 * voz de ARGOS (argos-tts) tienen su propio manejo y no pasan por aquí.
 */

/** Lo mínimo que este módulo necesita de un AudioPlayer de expo-audio. */
export interface StoppableAudioPlayer {
  pause(): void;
  remove(): void;
}

let activePlayer: StoppableAudioPlayer | null = null;
let loadGeneration = 0;

/**
 * Toma un turno de carga. Cada carga del player lo pide al arrancar y
 * verifica con `isLoadCurrent` después de cada await: si otra carga pidió
 * turno más tarde, esta ya no debe crear audio ni navegar.
 */
export function beginPlayerLoad(): number {
  return ++loadGeneration;
}

/** ¿Sigue siendo esta la carga más reciente? */
export function isLoadCurrent(generation: number): boolean {
  return generation === loadGeneration;
}

/**
 * Registra al player como el único vivo, descargando al anterior en el mismo
 * paso síncrono. Llamar INMEDIATAMENTE después de createAudioPlayer, sin
 * ningún await entre medio.
 */
export function claimActivePlayer(player: StoppableAudioPlayer): void {
  if (activePlayer && activePlayer !== player) {
    stopActivePlayer();
  }
  activePlayer = player;
}

/**
 * Suelta el lugar SOLO si este player aún lo ocupa (una carga más nueva pudo
 * haberlo reclamado). No descarga: eso es del dueño del player (cleanup).
 */
export function releaseActivePlayer(player: StoppableAudioPlayer): void {
  if (activePlayer === player) activePlayer = null;
}

/**
 * Apaga y descarga lo que esté sonando, sin importar quién lo creó.
 * Devuelve true si había algo que apagar.
 */
export function stopActivePlayer(): boolean {
  const player = activePlayer;
  if (!player) return false;
  activePlayer = null;
  try { player.pause(); } catch { /* ya liberado: el objetivo era el silencio */ }
  try { player.remove(); } catch { /* ya liberado */ }
  return true;
}

/** ¿Hay un audio vivo registrado? */
export function hasActivePlayer(): boolean {
  return activePlayer !== null;
}
