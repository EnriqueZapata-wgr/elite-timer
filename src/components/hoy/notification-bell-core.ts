/**
 * NotificationBellIcon — lógica pura del badge (Sprint HARDENING T3).
 * Separada del componente para testear en el harness node-only.
 */

/** Máximo mostrado en el badge; arriba de esto se muestra "9+". */
export const BELL_BADGE_MAX = 9;

/**
 * Texto del badge para un conteo de no leídas.
 * null = sin badge (0 o conteos inválidos/negativos).
 */
export function bellBadgeLabel(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > BELL_BADGE_MAX ? `${BELL_BADGE_MAX}+` : String(Math.floor(unread));
}
