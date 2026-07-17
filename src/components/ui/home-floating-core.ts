/**
 * Home Floating Button (#26 Batch 2) — lógica pura de visibilidad, espejo de
 * argos-floating-core. El tab bar solo existe en (tabs); en las decenas de
 * pantallas del Stack no hay forma rápida de volver a HOY sin backs múltiples.
 */
import { isOnboardingPath } from '@/src/components/argos/argos-floating-core';

/** Rutas donde el tab bar ya da Home (o ES Home) → el botón estorba. */
const TAB_PATHS = new Set(['/', '/index', '/yo', '/kit']);

export interface HomeVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
}

/**
 * Decide si el botón Home debe ocultarse:
 *  1. En HOY / tabs (yo, kit) → el tab bar ya resuelve Home.
 *  2. Onboarding / auth / Meet ARGOS → no estorbar el funnel (mismo criterio que ARGOS).
 *  3. Chat ARGOS → el input vive abajo; no taparlo.
 *  4. Teclado abierto → no tapar inputs.
 */
export function shouldHideHomeButton(input: HomeVisibilityInput): boolean {
  const p = (input.pathname ?? '/').toLowerCase();
  if (TAB_PATHS.has(p)) return true;
  if (isOnboardingPath(p)) return true;
  if (p.includes('argos-chat')) return true;
  if (input.keyboardVisible) return true;
  return false;
}
