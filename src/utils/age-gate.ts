/**
 * Age gate (#41 → Sprint Compliance 2) — lógica PURA, testeable.
 *
 * Decisión cerrada de compliance (DECISIONES_ENRIQUE_COMPLIANCE_2026-07-21,
 * fila 5): edad mínima 18 DURO. Fecha de nacimiento obligatoria + CB-4;
 * <18 bloquea la cuenta ("no disponible para menores"). El tier 'parental'
 * (13-17 con consentimiento de padre/madre) se eliminó — ATP trata datos
 * sensibles de salud y el Aviso de Privacidad declara la app solo-adultos.
 */

export type AgeGateTier = 'blocked' | 'passed';

/** Edad mínima para usar ATP (Aviso de Privacidad §7 + T&C §3). */
export const MIN_AGE = 18;

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

/** Tier del gate según edad en años cumplidos: <18 bloquea, ≥18 pasa. */
export function ageGateTier(age: number): AgeGateTier {
  if (!Number.isFinite(age) || age < MIN_AGE) return 'blocked';
  return 'passed';
}
