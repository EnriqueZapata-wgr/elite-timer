/**
 * ARGOS Floating Button — lógica pura de visibilidad (T2 Sprint MAGIA ARGOS).
 *
 * El botón flotante aparece en TODAS las pantallas menos donde estorba. Reglas
 * de auto-hide separadas del componente para testear sin render.
 */
import { screenFromPath, type ArgosScreen } from '@/src/hooks/argos-screen-context-core';

/**
 * ¿La ruta es una pantalla del pilar Mente con banner fijo propio? (Overhaul
 * Mente A3/A4). Ahí los flotantes (ARGOS + home) mueren: el banner superior
 * ya da back + home + electrones, y el player es full-focus (cero ARGOS).
 * Journal y check-in conservan los flotantes (sin banner en este run).
 */
export function isMentePillarPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.startsWith('/mente') || p === '/meditation' || p === '/breathing';
}

/** ¿La ruta es parte del onboarding? (ahí el floating no debe aparecer). */
export function isOnboardingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.includes('onboarding') || p.includes('/login') || p.includes('/register') ||
    p.includes('reset-password') || p.includes('forgot-password') || p.includes('/meet');
}

export interface FloatingVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
  /** Ocultado manualmente por una pantalla vía contexto. */
  manualHidden: boolean;
  /** Falso hasta que el usuario conoce a ARGOS (Meet ARGOS, T6). */
  introduced: boolean;
}

/**
 * Decide si el floating button debe ocultarse. Orden de cortes:
 *  1. No presentado aún (antes de Meet ARGOS) → oculto.
 *  2. Ocultado manualmente por la pantalla → oculto.
 *  3. Onboarding/auth → oculto.
 *  4. Pilar Mente (banner fijo propio + player full-focus) → oculto (A3/A4).
 *  5. En el chat ARGOS mismo → oculto (redundante).
 *  6. Teclado abierto → oculto (no tapar inputs).
 */
export function shouldHideFloatingButton(input: FloatingVisibilityInput): boolean {
  if (!input.introduced) return true;
  if (input.manualHidden) return true;
  if (isOnboardingPath(input.pathname)) return true;
  if (isMentePillarPath(input.pathname)) return true;
  const screen: ArgosScreen = screenFromPath(input.pathname);
  if (screen === 'argos') return true;
  if (input.keyboardVisible) return true;
  return false;
}
