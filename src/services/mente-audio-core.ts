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
 * (meditación/descanso) → meditation.
 */
export function sessionTypeFor(categoria: AudioCategoria): 'breathing' | 'meditation' {
  return categoria === 'respiracion' ? 'breathing' : 'meditation';
}

/** Fuente de electrón por tipo de sesión (espejo meditation.tsx/breathing.tsx). */
export function electronSourceFor(type: 'breathing' | 'meditation'): 'breathwork' | 'meditation' {
  return type === 'breathing' ? 'breathwork' : 'meditation';
}

// ── Delta economía 2026-07-23: escucha EFECTIVA (los seeks no cuentan) ──────

/**
 * Segundos efectivamente reproducidos entre dos status updates del player.
 * Un avance normal (0 < delta ≤ maxStep) suma; un salto mayor es un seek
 * hacia adelante (brincar al final NO cuenta) y un delta ≤ 0 es seek hacia
 * atrás o pausa — ninguno suma. maxStep ≈ 4× el updateInterval (500ms) con
 * holgura para ticks atrasados en background.
 */
export function effectiveListenDelta(prevPositionSeg: number, newPositionSeg: number, maxStepSeg = 2): number {
  if (!Number.isFinite(prevPositionSeg) || !Number.isFinite(newPositionSeg)) return 0;
  const delta = newPositionSeg - prevPositionSeg;
  return delta > 0 && delta <= maxStepSeg ? delta : 0;
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
