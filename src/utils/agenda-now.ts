/**
 * Helpers para el divisor "AHORA" de la agenda de HOY (F04.8).
 *
 * Doctrina (Opción C de Enrique): "AHORA" SIEMPRE visible como divisor entre pasado y futuro:
 *  - sin items → "AHORA" solo
 *  - todos futuros → "AHORA" arriba de todos
 *  - todos pasados → "AHORA" abajo de todos
 *  - mezcla → entre el último pasado y el primer futuro
 */

/**
 * Índice de inserción del divisor en una lista de items ORDENADA por hora.
 * = cantidad de items cuyo minuto-del-día es estrictamente menor que `nowMin`.
 * 0 → arriba de todos · items.length → abajo de todos · k → antes del item k.
 */
export function nowDividerIndex(itemMinutes: number[], nowMin: number): number {
  let idx = 0;
  for (const m of itemMinutes) {
    if (m < nowMin) idx++;
    else break; // la lista viene ordenada; el primer item >= now marca el corte
  }
  return idx;
}

/** Minutos del día (0–1439) desde una fecha local. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Etiqueta del divisor, ej. "AHORA · 10:42 am" (hora local 12h). */
export function formatNowLabel(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `AHORA · ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
