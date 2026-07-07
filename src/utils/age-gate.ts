/**
 * Age gate (#41, compliance stores) — lógica PURA, testeable.
 *
 * Reglas:
 *   <13  → blocked  (COPPA/stores: ATP no disponible)
 *   13-17 → parental (requiere consentimiento parental documentado)
 *   ≥18  → passed
 */

export type AgeGateTier = 'blocked' | 'parental' | 'passed';

/**
 * Edad en años cumplidos entre dos fechas YYYY-MM-DD (dob, hoy).
 * Calcula por calendario (no por 365.25) para respetar cumpleaños exactos.
 */
export function ageFromDob(dobISO: string, todayISO: string): number {
  const [dy, dm, dd] = dobISO.split('-').map(n => parseInt(n, 10));
  const [ty, tm, td] = todayISO.split('-').map(n => parseInt(n, 10));
  if (!dy || !dm || !dd || !ty || !tm || !td) return NaN;
  let age = ty - dy;
  // Aún no cumple años este año → restar 1
  if (tm < dm || (tm === dm && td < dd)) age -= 1;
  return age;
}

/** Tier del gate según edad en años cumplidos. */
export function ageGateTier(age: number): AgeGateTier {
  if (!Number.isFinite(age) || age < 13) return 'blocked';
  if (age < 18) return 'parental';
  return 'passed';
}

/** Validación mínima del email del padre/madre (parental consent). */
export function isValidParentalEmail(email: string): boolean {
  const e = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
