/**
 * Date Helpers — Funciones de fecha en zona horaria LOCAL del dispositivo.
 *
 * NUNCA usar new Date().toISOString().split('T')[0] para "hoy" — eso da UTC.
 * A medianoche local en UTC-6, toISOString() devuelve el día anterior.
 */

/** Retorna la fecha de hoy en formato YYYY-MM-DD en zona local. */
export function getLocalToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Verifica si una fecha string es hoy en zona local. */
export function isToday(dateString: string): boolean {
  return dateString === getLocalToday();
}

/** Retorna YYYY-MM-DD local para una fecha dada. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
