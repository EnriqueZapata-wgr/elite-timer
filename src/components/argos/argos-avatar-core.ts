/**
 * ARGOS Avatar — lógica pura de animación (T1 Sprint MAGIA ARGOS).
 *
 * Separada del componente para poder testear el mapeo estado→parámetros sin
 * renderizar RN (el repo no tiene testing-library; convención: extraer lógica
 * pura a *-core.ts y validar el render en device).
 */

export type ArgosAvatarState = 'idle' | 'thinking' | 'speaking';
export type ArgosAvatarVariant = 'compact' | 'full';

export interface AvatarAnimSpec {
  /** Escala pico del "respiro" (1.0 = sin movimiento). */
  scaleTo: number;
  /** Duración de medio ciclo del respiro, ms. Más bajo = más rápido. */
  scaleDuration: number;
  /** Opacidad mínima del halo. */
  glowMin: number;
  /** Opacidad máxima del halo. */
  glowMax: number;
  /** Duración de medio ciclo del halo, ms. */
  glowDuration: number;
  /** Si el estado dibuja la onda de barras (audio-like). */
  bars: boolean;
}

/**
 * Parámetros de animación por estado. Valores calibrados a la spec:
 *  - idle: respiración sutil ~3.2s (scale 1.0→1.03), halo estable tenue.
 *  - thinking: pulsos más rápidos + shimmer (halo más marcado).
 *  - speaking: barras audio-like; el orbe respira leve y rápido de fondo.
 */
export function avatarSpecForState(state: ArgosAvatarState): AvatarAnimSpec {
  switch (state) {
    case 'thinking':
      return { scaleTo: 1.05, scaleDuration: 620, glowMin: 0.28, glowMax: 0.6, glowDuration: 620, bars: false };
    case 'speaking':
      return { scaleTo: 1.02, scaleDuration: 900, glowMin: 0.3, glowMax: 0.5, glowDuration: 900, bars: true };
    case 'idle':
    default:
      return { scaleTo: 1.03, scaleDuration: 1600, glowMin: 0.18, glowMax: 0.32, glowDuration: 1600, bars: false };
  }
}

/** Número de barras de la onda de "speaking" según variante. */
export function barCountForVariant(variant: ArgosAvatarVariant): number {
  return variant === 'full' ? 5 : 3;
}

/**
 * Retraso escalonado (ms) de cada barra para que la onda no lata al unísono.
 * Determinista: barra i entra `i * step` ms después.
 */
export function barDelay(index: number, step = 120): number {
  return index * step;
}

/** Clamp de tamaño para no romper layout (avatar entre 20 y 160 px). */
export function clampAvatarSize(size: number): number {
  if (!Number.isFinite(size)) return 32;
  return Math.max(20, Math.min(160, size));
}
