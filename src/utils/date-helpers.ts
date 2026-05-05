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

/** Retorna la hora actual local (0-23). */
export function getLocalHour(): number {
  return new Date().getHours();
}

/** Retorna YYYY-MM-DD local para una fecha dada. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsear fecha-string como LOCAL (no UTC).
 * "2026-05-04" -> Date en mediodía local (evita desfase de timezone).
 * Si el string ya incluye hora (T...), se respeta tal cual.
 */
export function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T12:00:00');
}

/** Nombre del día de la semana en español para una fecha YYYY-MM-DD. */
export function getLocalDayName(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('es-MX', { weekday: 'long' });
}

/** Formatea una fecha YYYY-MM-DD a español, respetando timezone local. */
export function formatLocalDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString(
    'es-MX',
    options || { weekday: 'long', day: 'numeric', month: 'long' },
  );
}
