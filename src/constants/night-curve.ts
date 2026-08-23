/**
 * night-curve — LA curva nocturna, una sola vez (MB-31A · Pieza 3).
 *
 * Manual de marca 3.7: "La misma curva sirve para tres cosas: el filtro de
 * la app, la pantalla del Sleep Cycle en el buró, y el filtro de sistema de
 * Android. Una sola curva, tres usos." Antes de MB-31A había dos hogares
 * (night-filter-core de MB-30B y night-palette de MB-30A, que pedía a
 * gritos ser absorbida). Este módulo es el hogar único; los tres usos jalan
 * de aquí:
 *
 *   1. El velo in-app (night-veil-core + NightVeil) — MB-31A.
 *   2. El filtro de sistema Android (night-filter-core re-exporta la rampa
 *      y la serializa al servicio; su fallback Kotlin tiene test espejo).
 *   3. La pantalla nocturna del buró (night-palette re-exporta NIGHT).
 *
 * ⚠️ Los VALORES no cambian aquí: son los que MB-30A/30B calibraron y ya
 * viven en el binario (el fallback Kotlin es espejo byte a byte de la
 * rampa). Recalibrar la curva es una decisión aparte, no un refactor.
 */

export interface RampStop {
  /** Minutos relativos al corte (negativo = antes del corte). */
  at: number;
  r: number;
  g: number;
  b: number;
  /** Opacidad 0..1. */
  a: number;
}

/**
 * La progresión del ámbar al rojo, anclada al corte de pantallas del
 * usuario: 1h antes entra el ámbar suave; al corte, naranja; 1h después,
 * rojo — y ahí se sostiene hasta la mañana. Opacidades moderadas: un filtro
 * que no deja ver es una desinstalación, no un hábito.
 */
export const NIGHT_FILTER_RAMP: RampStop[] = [
  { at: -60, r: 255, g: 191, b: 0, a: 0.1 }, // ámbar suave, 1h antes del corte
  { at: 0, r: 255, g: 140, b: 0, a: 0.22 }, // naranja al corte
  { at: 60, r: 255, g: 60, b: 0, a: 0.34 }, // rojo 1h después; se sostiene
];

/** 05:00 — la mañana apaga el filtro aunque nadie lo toque. */
export const NIGHT_FILTER_END_MINUTES = 5 * 60;

/** Fallback si la hora del usuario no se puede leer (espejo de tareas-core). */
export const NIGHT_FILTER_FALLBACK_CUTOFF = 21 * 60 + 45; // '21:45'

/**
 * Paleta de la PANTALLA DE SESIÓN NOCTURNA (app/sleep-session.tsx, MB-30A):
 * el final de la misma curva, asentado para un teléfono OLED que pasa la
 * noche encendido en el buró — negro absoluto y un rojo brasa sin azules,
 * calibrado a mano para luz mínima (no es el rojo del velo compuesto: aquí
 * el fondo es negro puro y el texto ES el color).
 */
export const NIGHT = {
  /**
   * Fondo: negro absoluto (OLED apagado).
   *
   * ACERO (22-ago-2026): este token existía desde MB-30A y NO lo consumía
   * nadie. La pantalla del buró tomaba su lienzo del tema global y coincidía
   * en #000000 de pura casualidad. Al aclarar el modo oscuro a acero, la
   * casualidad se habría acabado y el teléfono del buró habría amanecido
   * gris azulado a media noche, que es justo lo contrario de para lo que se
   * diseñó. Ahora `app/sleep-session.tsx` lo pasa explícito por el prop
   * `fondo` de <Screen> y el negro de esta pantalla es una decisión escrita,
   * no un accidente.
   */
  bg: '#000000',
  /** Rojo brasa — texto protagonista (la hora). */
  ember: '#B4443A',
  /** Rojo tenue — texto secundario. */
  emberDim: 'rgba(180,68,58,0.55)',
  /** Rojo apenas visible — labels y metadatos. */
  emberFaint: 'rgba(180,68,58,0.32)',
  /** Líneas y bordes. */
  hairline: 'rgba(180,68,58,0.14)',
  /** Relleno de un control activo (chip/CTA), sigue siendo oscuro. */
  fill: 'rgba(180,68,58,0.10)',
} as const;
