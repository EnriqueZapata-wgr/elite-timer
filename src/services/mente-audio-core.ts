/**
 * Sprint Audio Mente — lógica PURA (testeable en vitest, sin RN/supabase).
 */
import type { AudioCategoria } from './mente-audio-service-types';

export type { AudioCategoria };

/**
 * Regla de persistencia de progreso: cerca del final (<30s restantes) o al
 * inicio (<10s) NO se guarda — la próxima escucha empieza de cero.
 */
export function shouldClearPosition(positionSeg: number, duracionSeg: number): boolean {
  return positionSeg < 10 || duracionSeg - positionSeg < 30;
}

/**
 * Tipo de mind_sessions por categoría — respeta el CHECK de la migración 049
 * ('breathing' | 'meditation' | 'checkin'): respiración → breathing; el resto
 * (meditación/descanso/mantra/visualización) → meditation. 'binaural' nunca
 * llega aquí: no es sesión (logAudioSession lo rechaza antes).
 */
export function sessionTypeFor(categoria: AudioCategoria): 'breathing' | 'meditation' {
  return categoria === 'respiracion' ? 'breathing' : 'meditation';
}

/** Fuente de electrón por tipo de sesión (espejo meditation.tsx/breathing.tsx). */
export function electronSourceFor(type: 'breathing' | 'meditation'): 'breathwork' | 'meditation' {
  return type === 'breathing' ? 'breathwork' : 'meditation';
}

// ── Escucha EFECTIVA por posición (Overhaul Mente A0) ───────────────────────
//
// El modelo viejo acumulaba ticks de `playbackStatusUpdate` — pero en
// background/lockscreen (el caso de uso real) el hilo JS se pausa: no acumula,
// y al volver el salto de posición se clasificaba como seek → el gate de ≥80%
// nunca se alcanzaba y la pieza terminada no otorgaba e- (bug P0).
//
// Modelo nuevo: la escucha efectiva se deriva de la POSICIÓN (que el player
// nativo avanza aunque JS duerma), restando el neto de saltos-forward hechos
// con seeks explícitos (skip ±15 / scrubber). `didJustFinish` garantiza que el
// final se alcanzó reproduciendo, no arrastrando el scrubber más allá del fin.

/**
 * Actualiza el neto de segundos SALTADOS tras un seek explícito from→to.
 * Seek adelante suma el brinco (ese contenido no se escuchó); seek atrás lo
 * descuenta (el contenido se va a re-reproducir y la posición lo re-gana),
 * con clamp en 0 para que retroceder nunca regale crédito extra.
 */
export function applySeekToSkip(netSkipSeg: number, fromSeg: number, toSeg: number): number {
  const base = Number.isFinite(netSkipSeg) ? Math.max(0, netSkipSeg) : 0;
  if (!Number.isFinite(fromSeg) || !Number.isFinite(toSeg)) return base;
  return Math.max(0, base + (toSeg - fromSeg));
}

/**
 * Segundos efectivamente escuchados con la posición actual: lo recorrido desde
 * el punto de arranque de esta escucha, menos lo saltado con seeks, más el
 * crédito persistido de escuchas anteriores de la misma pieza (retomar a la
 * mitad sigue acumulando hacia el 80%).
 */
export function effectiveListenedAt(
  positionSeg: number,
  startPosSeg: number,
  netSkipSeg: number,
  priorListenedSeg: number,
): number {
  const prior = Number.isFinite(priorListenedSeg) ? Math.max(0, priorListenedSeg) : 0;
  if (!Number.isFinite(positionSeg) || !Number.isFinite(startPosSeg) || !Number.isFinite(netSkipSeg)) {
    return prior;
  }
  return Math.max(0, positionSeg - startPosSeg - Math.max(0, netSkipSeg)) + prior;
}

/**
 * Entrada persistida de progreso por pieza. Formato viejo: número (posición).
 * Formato nuevo: { p: posición, l: segundos efectivos acumulados } — para que
 * retomar una pieza a la mitad siga acumulando hacia el 80% comprobado.
 */
export interface StoredAudioProgress {
  position: number;
  listened: number;
}

export function parseProgressEntry(v: unknown): StoredAudioProgress | null {
  if (typeof v === 'number' && isFinite(v) && v > 0) return { position: v, listened: 0 };
  if (v && typeof v === 'object') {
    const p = (v as any).p;
    const l = (v as any).l;
    if (typeof p === 'number' && isFinite(p) && p > 0) {
      return { position: p, listened: typeof l === 'number' && isFinite(l) && l > 0 ? l : 0 };
    }
  }
  return null;
}

export function serializeProgressEntry(position: number, listened: number): { p: number; l: number } {
  return { p: Math.floor(position), l: Math.floor(Math.max(0, listened)) };
}
