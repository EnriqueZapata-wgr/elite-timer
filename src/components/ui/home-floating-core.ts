/**
 * Home Floating Button (#26 Batch 2) — lógica pura de visibilidad, espejo de
 * argos-floating-core. El tab bar solo existe en (tabs); en las decenas de
 * pantallas del Stack no hay forma rápida de volver a HOY sin backs múltiples.
 */
import {
  isMentePillarPath,
  isOnboardingPath,
  isPublicEmergencyPath,
  isTabRootPath,
} from '@/src/components/argos/argos-floating-core';

/* Triple-audit P1.2: el botón se oculta en TODOS los tabs — el tab bar ya da
 * Home y la casita (top-left, insets.top+52) tapaba los headers propios de esos
 * tabs ("TU ECOSISTEMA" en kit → se leía "OSISTEMA"). El top-left queda solo
 * para pantallas profundas del Stack, que era el problema original.
 *
 * MB-19: la lista local se retiró. Vivía aquí una copia con cuatro rutas y se
 * quedó atrás en cuanto el tab bar pasó a cinco salas, así que el bug de arriba
 * iba a repetirse en SALUD y en TRIBU. Ahora sale de RUTAS_DE_TAB, la fuente
 * única, que además cubre las cuatro retiradas con href: null. */

export interface HomeVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
  /** V1.5.1 (#8): la pantalla enfocada pinta su propia casita (nav-presence). */
  screenHasOwnNav?: boolean;
}

/**
 * Decide si el botón Home debe ocultarse:
 *  1. En cualquier tab → el tab bar ya resuelve Home y la casita tapa headers.
 *  2. Onboarding / auth / Meet ARGOS → no estorbar el funnel (mismo criterio que ARGOS).
 *  2b. Ficha de emergencia pública → FIX-215: la casita se pintaba encima de la
 *      primera letra del nombre, que es el dato número uno de esa pantalla.
 *  3. Pilar Mente → el banner fijo del pilar ya trae home (Overhaul A3).
 *  4. Chat ARGOS → el input vive abajo; no taparlo.
 *  5. Teclado abierto → no tapar inputs.
 *  6. V1.5.1 (#8): header estándar con casita propia (ScreenHeader/PillarHeader/
 *     StickyPillarBanner) → el flotante sobra y estorba.
 */
export function shouldHideHomeButton(input: HomeVisibilityInput): boolean {
  const p = (input.pathname ?? '/').toLowerCase();
  if (isTabRootPath(p)) return true;
  if (isOnboardingPath(p)) return true;
  if (isPublicEmergencyPath(p)) return true;
  if (isMentePillarPath(p)) return true;
  if (p.includes('argos-chat')) return true;
  if (input.keyboardVisible) return true;
  if (input.screenHasOwnNav) return true;
  return false;
}
