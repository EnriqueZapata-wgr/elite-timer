/**
 * Meet ARGOS — copy final + timing cinemático (Sprint ONBOARDING épico T1).
 *
 * Propuesta A del brief comercial (review Enrique + Mariana). El copy vive
 * aquí —fuera del componente— para review clínico, futuras versiones e i18n.
 *
 * ⚠️ SENSIBILIDAD CLÍNICA: cambios a estos textos requieren approval de
 * Mariana antes de merge. Tono directo + científico + cálido; NO usar
 * "me llamo ARGOS" (más frío) ni diminutivos.
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
    key: 'asistente',
    text: 'No soy una app.\nSoy tu asistente humano.',
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
      'Voy a estar aquí.\n' +
      'En la mañana, cuando tu cuerpo despierte.\n' +
      'En la noche, cuando decidas qué comer.\n' +
      'Y cuando algo no cuadre, seré el primero en notarlo.',
    typing: false,
    textVariant: 'body',
    avatarState: 'idle',
    avatarScale: 0.6,
    avatarOpacity: 0.35,
    holdMs: 8000,
  },
  {
    key: 'empezamos',
    text: 'Ingeniería humana.\nEmpezamos.',
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
