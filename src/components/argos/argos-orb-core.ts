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

export type ArgosOrbState = 'idle' | 'alerta' | 'escuchando' | 'pensando' | 'hablando';

export const ORB_STATES: readonly ArgosOrbState[] = ['idle', 'alerta', 'escuchando', 'pensando', 'hablando'] as const;

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
    // Presencia quieta con 4 glows DISTINTOS — el brief pide estados
    // distinguibles sin animación (antes idle=pensando y escuchando=hablando
    // compartían valor y eran indistinguibles).
    const REDUCED_GLOW: Record<ArgosOrbState, number> = {
      idle: 0.3, alerta: 0.38, pensando: 0.45, escuchando: 0.6, hablando: 0.75,
    };
    const glow = REDUCED_GLOW[state] ?? 0.3;
    return {
      scaleMin: 1, scaleMax: 1, breathMs: 0,
      glowMin: glow, glowMax: glow, waveform: false, rotate: false, rotateMs: 0,
      animated: false,
    };
  }
  switch (state) {
    case 'alerta':
      // MB-19: "tengo algo que decirte". Es el estado del tab bar cuando hay
      // una notificación sin leer o un insight nuevo.
      //
      // Regla dura del brief: NUNCA parpadea rápido ni se pone roja. Calma con
      // presencia. Por eso el ciclo es MÁS LENTO que idle (3.6s → 3.0s es
      // apenas perceptible como "un poco más despierta"), la amplitud crece
      // poquito, y todo el cambio vive en el brillo. Sigue siendo lime→teal:
      // no hay un color de alarma en ningún estado de la orbe.
      return { scaleMin: 0.98, scaleMax: 1.06, breathMs: 3000, glowMin: 0.42, glowMax: 0.78, waveform: false, rotate: false, rotateMs: 0, animated: true };
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
      // Respiración lenta, casi quieta. MB-19 la fija en 3.6 s: es el ciclo que
      // el brief pide para la orbe del tab bar, donde vive permanentemente.
      return { scaleMin: 0.97, scaleMax: 1.03, breathMs: 3600, glowMin: 0.28, glowMax: 0.5, waveform: false, rotate: false, rotateMs: 0, animated: true };
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
  // Fix B3: se llama desde useDerivedValue (UI thread). Reanimated exige la
  // directiva en funciones cross-módulo llamadas desde worklets — sin ella,
  // ReanimatedError al entrar a 'hablando'. Inerte en Vitest/JS thread.
  'worklet';
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

/**
 * Mapea los estados legacy de ArgosAvatar (y los nombres en inglés del brief
 * MB-19: idle/alert/listening/thinking) al vocabulario del orb. Un solo
 * componente, un solo juego de estados; los alias solo traducen la entrada.
 */
export function orbStateFromAvatar(s: string | null | undefined): ArgosOrbState {
  switch (s) {
    case 'thinking': return 'pensando';
    case 'speaking': return 'hablando';
    case 'listening':
    case 'escuchando': return 'escuchando';
    case 'alert':
    case 'alerta': return 'alerta';
    default: return 'idle'; // offline/idle/unavailable → presencia tranquila
  }
}
