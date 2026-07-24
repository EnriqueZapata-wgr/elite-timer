/**
 * Home Floating Button (#26 Batch 2) — lógica pura de visibilidad, espejo de
 * argos-floating-core. El tab bar solo existe en (tabs); en las decenas de
 * pantallas del Stack no hay forma rápida de volver a HOY sin backs múltiples.
 */
import { isMentePillarPath, isOnboardingPath } from '@/src/components/argos/argos-floating-core';

/** Triple-audit P1.2: el botón se oculta en TODOS los tabs — en /yo y /kit el
 * tab bar ya da Home y la casita (top-left, insets.top+52) tapaba los headers
 * propios de esos tabs ("TU ECOSISTEMA" en kit → se leía "OSISTEMA"). El
 * top-left queda solo para pantallas profundas del Stack, que era el problema
 * original de navegación. */
const TAB_PATHS = new Set(['/', '/index', '/yo', '/kit']);

export interface HomeVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
  /** V1.5.1 (#8): la pantalla enfocada pinta su propia casita (nav-presence). */
  screenHasOwnNav?: boolean;
}

/**
 * Decide si el botón Home debe ocultarse:
 *  1. En tabs (HOY/yo/kit) → el tab bar ya resuelve Home y la casita tapa headers.
 *  2. Onboarding / auth / Meet ARGOS → no estorbar el funnel (mismo criterio que ARGOS).
 *  3. Pilar Mente → el banner fijo del pilar ya trae home (Overhaul A3).
 *  4. Chat ARGOS → el input vive abajo; no taparlo.
 *  5. Teclado abierto → no tapar inputs.
 *  6. V1.5.1 (#8): header estándar con casita propia (ScreenHeader/PillarHeader/
 *     StickyPillarBanner) → el flotante sobra y estorba.
 */
export function shouldHideHomeButton(input: HomeVisibilityInput): boolean {
  const p = (input.pathname ?? '/').toLowerCase();
  if (TAB_PATHS.has(p)) return true;
  if (isOnboardingPath(p)) return true;
  if (isMentePillarPath(p)) return true;
  if (p.includes('argos-chat')) return true;
  if (input.keyboardVisible) return true;
  if (input.screenHasOwnNav) return true;
  return false;
}
