/**
 * Meet ARGOS — lógica pura del trigger de arranque (T3 MAGIA ARGOS 2.0).
 *
 * ROOT CAUSE del bug "reseteé el flag y no vi la pantalla": la ÚNICA
 * navegación a /argos/meet era el return de completeV2Step (fin del
 * onboarding v2). Para un usuario EXISTENTE con argos_introduced_at = NULL
 * no había ningún trigger — el flag en NULL solo ocultaba el floating
 * button (shouldHideFloatingButton corta con !introduced) y nada más.
 *
 * Fix: MeetArgosGate (layout raíz) evalúa esta función y navega a
 * /argos/meet cuando el usuario está en la app principal sin haber
 * conocido a ARGOS.
 */
import { isOnboardingPath } from './argos-floating-core';

export interface MeetArgosTriggerInput {
  /** Hay sesión activa. */
  hasUser: boolean;
  /** profiles.argos_introduced_at IS NOT NULL (vía ArgosPresenceContext). */
  introduced: boolean;
  pathname: string | null | undefined;
  /** El gate ya disparó en esta sesión (guard de re-entrada). */
  alreadyTriggered: boolean;
}

/**
 * ¿Debe dispararse Meet ARGOS ahora? Cortes en orden:
 *  1. Ya disparó esta sesión → no (una sola vez).
 *  2. Sin sesión → no.
 *  3. Ya presentado → no.
 *  4. Ruta no asentada ('/' = index redirigiendo) → no (evita race con Redirect).
 *  5. Onboarding / auth / el propio meet → no (el onboarding tiene su
 *     propia navegación al final de completeV2Step).
 */
export function shouldTriggerMeetArgos(input: MeetArgosTriggerInput): boolean {
  if (input.alreadyTriggered) return false;
  if (!input.hasUser) return false;
  if (input.introduced) return false;
  if (!input.pathname || input.pathname === '/') return false;
  if (isOnboardingPath(input.pathname)) return false;
  return true;
}
