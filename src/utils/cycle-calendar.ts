/**
 * cycle-calendar — math pura del grid del calendario de ciclo (semana arranca en LUNES).
 * Extraído de app/cycle.tsx para poder testear la alineación de días sin renderizar RN.
 * Doctrina #3: fechas como YYYY-MM-DD con T12:00:00 para evitar saltos por timezone.
 */

/** Día de la semana con LUNES=0 … DOMINGO=6. */
export function getWeekdayMondayFirst(dateStr: string): number {
  return (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
}

/** Todos los días de un mes como YYYY-MM-DD (month: 0=Enero). */
export function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

/**
 * Construye las celdas del grid: huecos iniciales (null) hasta el primer día según su
 * weekday (lunes-primero) + los días del mes, completando la última fila a múltiplo de 7.
 * Garantiza 7 columnas alineadas con los encabezados Lu-Ma-Mi-Ju-Vi-Sa-Do.
 */
export function buildCalendarGrid(year: number, month: number): (string | null)[] {
  const days = getMonthDays(year, month);
  const lead = days.length > 0 ? getWeekdayMondayFirst(days[0]) : 0;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
