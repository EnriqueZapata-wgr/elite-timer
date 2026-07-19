/**
 * ARGOS Orb — lógica PURA de la esfera translúcida lime→teal que respira (MB-4 J2).
 *
 * Presencia estilo Siri/Dynamic Island: materia de energía, no mascota. 4 estados
 * (nomenclatura del spec MB-4), cada uno con su motion:
 *   idle        → respiración lenta (~4s ciclo, ease-in-out). Presencia viva sin pedir atención.
 *   escuchando  → la esfera se abre/expande sutil (captando).
 *   pensando    → rotación interna lenta, sin waveform (energía concentrada).
 *   hablando    → waveform reactiva, SOLO mientras habla.
 *
 * reduced-motion: si el usuario lo tiene activo, NO se apaga — degrada a un pulso
 * mínimo por opacidad/color, sin animación continua que maree (doctrina spec §2.3).
 *
 * Separado del componente para testear el mapeo estado→spec sin renderizar RN.
 * NOTA COLORES: espejo de brand.ts (ATP_BRAND.lime/teal). No se importa brand.ts
 * (arrastra require() de imágenes y rompe Vitest node-only). Si brand cambia, actualizar.
 */

export type ArgosOrbState = 'idle' | 'escuchando' | 'pensando' | 'hablando';

export const ORB_STATES: readonly ArgosOrbState[] = ['idle', 'escuchando', 'pensando', 'hablando'] as const;

// Espejo de ATP_BRAND — ver nota del encabezado.
export const ORB_LIME = '#A8E02A';
export const ORB_TEAL = '#1ABC9C';

export interface OrbSpec {
  /** Escala base de la esfera respirando (min→max del ciclo). */
  scaleMin: number;
  scaleMax: number;
  /** Duración de UN ciclo de respiración completo, ms (ida y vuelta). */
  breathMs: number;
  /** Opacidad del núcleo/halo (min→max). */
  glowMin: number;
  glowMax: number;
  /** ¿Dibuja waveform reactiva? Solo 'hablando'. */
  waveform: boolean;
  /** ¿Rota el núcleo interno? Solo 'pensando'. */
  rotate: boolean;
  /** Velocidad de rotación (ms por vuelta); 0 = sin rotación. */
  rotateMs: number;
  /** false → sin animación continua (lo pone reduced-motion). */
  animated: boolean;
}

/** Duración del crossfade entre estados (feel Apple, interrumpible). */
export const ORB_TRANSITION_MS = 260;

/**
 * Spec de animación por estado. Con reducedMotion, todos degradan a un pulso de
 * opacidad mínimo (animated=false, sin escala/rotación/waveform) — presencia sin mareo.
 */
export function orbSpecForState(state: ArgosOrbState, reducedMotion = false): OrbSpec {
  if (reducedMotion) {
    // Pulso mínimo por opacidad: el orb sigue "presente" pero quieto.
    const glow = state === 'hablando' || state === 'escuchando' ? 0.6 : 0.4;
    return {
      scaleMin: 1, scaleMax: 1, breathMs: 0,
      glowMin: glow, glowMax: glow, waveform: false, rotate: false, rotateMs: 0,
      animated: false,
    };
  }
  switch (state) {
    case 'escuchando':
      // Se abre/expande sutil — más amplitud, respiración más ágil.
      return { scaleMin: 1.02, scaleMax: 1.12, breathMs: 2600, glowMin: 0.45, glowMax: 0.8, waveform: false, rotate: false, rotateMs: 0, animated: true };
    case 'pensando':
      // Energía concentrada: rotación interna lenta, respiración contenida.
      return { scaleMin: 0.98, scaleMax: 1.04, breathMs: 2200, glowMin: 0.35, glowMax: 0.65, waveform: false, rotate: true, rotateMs: 3600, animated: true };
    case 'hablando':
      // Waveform reactiva mientras habla.
      return { scaleMin: 1.0, scaleMax: 1.06, breathMs: 1400, glowMin: 0.5, glowMax: 0.9, waveform: true, rotate: false, rotateMs: 0, animated: true };
    case 'idle':
    default:
      // Respiración lenta ~4s, casi quieto.
      return { scaleMin: 0.97, scaleMax: 1.03, breathMs: 4000, glowMin: 0.28, glowMax: 0.5, waveform: false, rotate: false, rotateMs: 0, animated: true };
  }
}

/**
 * Alturas normalizadas (0..1) de las barras de la waveform de 'hablando'.
 * Determinístico por índice+fase (no Math.random — reproducible y testeable);
 * el componente lo muestrea en cada frame con la fase animada.
 *
 * @param count número de barras
 * @param phase 0..1 fase del ciclo de animación
 */
export function waveformBars(count: number, phase: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Dos senoides desfasadas por barra → movimiento orgánico, simétrico al centro.
    const center = (count - 1) / 2;
    const distFromCenter = Math.abs(i - center) / (center || 1);
    const wave = Math.sin(phase * Math.PI * 2 + i * 0.9) * 0.5 + 0.5;
    // Las barras del centro pesan más (forma de "voz").
    const envelope = 1 - distFromCenter * 0.55;
    bars.push(Math.max(0.12, wave * envelope));
  }
  return bars;
}

/** Mapea los estados legacy de ArgosAvatar al orb (para reusar call sites). */
export function orbStateFromAvatar(s: string | null | undefined): ArgosOrbState {
  switch (s) {
    case 'thinking': return 'pensando';
    case 'speaking': return 'hablando';
    case 'listening':
    case 'escuchando': return 'escuchando';
    default: return 'idle'; // offline/idle/unavailable → presencia tranquila
  }
}
