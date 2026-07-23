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
