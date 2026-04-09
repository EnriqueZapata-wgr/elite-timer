/**
 * Security Utilities — Sanitización de inputs y validación.
 *
 * Usar antes de enviar datos a Supabase o mostrar contenido
 * que proviene de fuentes externas (AI, wearables, etc).
 */

/** Sanitiza texto libre del usuario antes de enviarlo a la DB. */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')   // Prevenir XSS básico
    .trim()
    .slice(0, 5000);        // Largo máximo razonable
}

/** Valida formato UUID v4. */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Clampea un número entre min y max. Para inputs numéricos de usuario. */
export function sanitizeNumber(value: string | number, min: number, max: number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}
