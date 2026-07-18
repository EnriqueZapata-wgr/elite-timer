/**
 * Home Floating Button (#26 Batch 2) — lógica pura de visibilidad, espejo de
 * argos-floating-core. El tab bar solo existe en (tabs); en las decenas de
 * pantallas del Stack no hay forma rápida de volver a HOY sin backs múltiples.
 */
import { isOnboardingPath } from '@/src/components/argos/argos-floating-core';

/** HOME-1 (MB-0): el botón solo sobra donde YA estás en HOY. En /yo y /kit
 * (tabs hermanos) SÍ se muestra — persistente en toda la app menos HOY. */
const HOY_PATHS = new Set(['/', '/index']);

export interface HomeVisibilityInput {
  pathname: string | null | undefined;
  keyboardVisible: boolean;
}

/**
 * Decide si el botón Home debe ocultarse:
 *  1. En HOY → ya estás en Home (único tab exento — HOME-1).
 *  2. Onboarding / auth / Meet ARGOS → no estorbar el funnel (mismo criterio que ARGOS).
 *  3. Chat ARGOS → el input vive abajo; no taparlo.
 *  4. Teclado abierto → no tapar inputs.
 */
export function shouldHideHomeButton(input: HomeVisibilityInput): boolean {
  const p = (input.pathname ?? '/').toLowerCase();
  if (HOY_PATHS.has(p)) return true;
  if (isOnboardingPath(p)) return true;
  if (p.includes('argos-chat')) return true;
  if (input.keyboardVisible) return true;
  return false;
}
