/**
 * Meet ARGOS — copy + timing cinemático (T1 → reescrito en triple-audit P1.5
 * con la persona de SPEC_ARGOS_JARVIS_v1 §1.1: mentor que YA recorrió el
 * camino, ingeniero de la creencia — muere el "asistente humano" genérico).
 *
 * ⚠️ SENSIBILIDAD CLÍNICA: cambios a estos textos requieren approval de
 * Mariana antes de merge (GATE VIGENTE para esta versión — ver delivery).
 * Tono directo + cálido + exigente; NO "me llamo ARGOS", NO diminutivos,
 * NO auto-nombrarse más de una vez (spec D3).
 *
 * Archivo puro (sin react-native): testeable con el harness Vitest node-only.
 */
import type { ArgosAvatarState } from '@/src/components/argos/argos-avatar-core';

export interface MeetArgosScreenCopy {
  key: string;
  /** Texto de la pantalla. '{nombre}' se interpola con el primer nombre. */
  text: string;
  /** true → el texto aparece letra por letra (typing effect). */
  typing: boolean;
  /** Jerarquía tipográfica: hero = frases cortas grandes, body = párrafo. */
  textVariant: 'hero' | 'body';
  /** Estado del avatar (idle → speaking marca la subida de intensidad). */
  avatarState: ArgosAvatarState;
  /** Escala relativa del avatar (1 = tamaño base) — progresión de presencia. */
  avatarScale: number;
  /** Opacidad del avatar (la pantalla 4 lo manda "de fondo"). */
  avatarOpacity: number;
  /** Pausa tras revelar el texto completo antes de auto-avanzar. 0 = espera al usuario. */
  holdMs: number;
}

/** Velocidad del typing effect (~40ms/char, spec del brief). */
export const MEET_TYPING_MS_PER_CHAR = 40;
/** Fade + slide-up entre pantallas. */
export const MEET_TRANSITION_MS = 300;
/** Pausa dramática antes de que aparezca el CTA en la última pantalla. */
export const MEET_CTA_DELAY_MS = 1100;
export const MEET_CTA_LABEL = 'VAMOS';
export const MEET_TAP_HINT = 'Toca para continuar';

/**
 * Guion de 5 pantallas (Propuesta A). Timing por pantalla ≈ 6-8s con
 * auto-avance (o tap para adelantar); la última espera el CTA.
 */
export const MEET_SCREENS: MeetArgosScreenCopy[] = [
  {
    key: 'hola',
    text: 'Hola, {nombre}.',
    typing: true,
    textVariant: 'hero',
    avatarState: 'idle',
    avatarScale: 0.82,
    avatarOpacity: 1,
    holdMs: 6000,
  },
  {
    key: 'soy-argos',
    text: 'Soy ARGOS.',
    typing: true,
    textVariant: 'hero',
    avatarState: 'speaking',
    avatarScale: 0.92,
    avatarOpacity: 1,
    holdMs: 6000,
  },
  {
    key: 'mentor',
    text: 'No soy un chatbot.\nSoy un mentor que ya recorrió el camino.',
    typing: true,
    textVariant: 'hero',
    avatarState: 'speaking',
    avatarScale: 1,
    avatarOpacity: 1,
    holdMs: 6000,
  },
  {
    key: 'promesa',
    text:
      'Voy a recordarte lo que YA lograste — la gente olvida sus victorias; yo soy tu memoria de ellas.\n' +
      'Y cuando algo falte, te lo voy a decir de frente: no como muro, como el siguiente tramo de tu ruta.',
    typing: false,
    textVariant: 'body',
    avatarState: 'idle',
    avatarScale: 0.6,
    avatarOpacity: 0.35,
    holdMs: 8000,
  },
  {
    key: 'empezamos',
    text: 'Si hay un 1%, hay una ruta.\nEmpezamos.',
    typing: false,
    textVariant: 'hero',
    avatarState: 'idle',
    avatarScale: 0.82,
    avatarOpacity: 1,
    holdMs: 0,
  },
];

/**
 * Interpola '{nombre}'. Sin nombre, degrada con gracia:
 * "Hola, {nombre}." → "Hola." (sin coma huérfana).
 */
export function resolveMeetText(text: string, firstName: string): string {
  const name = firstName.trim();
  if (!name) return text.replace(/,\s*\{nombre\}/g, '').replace(/\{nombre\}/g, '');
  return text.replace(/\{nombre\}/g, name);
}

/** Duración del reveal por typing para un texto dado. */
export function typingDurationMs(text: string, msPerChar: number = MEET_TYPING_MS_PER_CHAR): number {
  return text.length * msPerChar;
}

/**
 * Tiempo total en pantalla sin interacción (reveal + hold).
 * 0 = la pantalla no auto-avanza (espera al usuario).
 */
export function meetScreenDwellMs(screen: MeetArgosScreenCopy, firstName = ''): number {
  if (screen.holdMs <= 0) return 0;
  const reveal = screen.typing ? typingDurationMs(resolveMeetText(screen.text, firstName)) : 0;
  return reveal + screen.holdMs;
}
