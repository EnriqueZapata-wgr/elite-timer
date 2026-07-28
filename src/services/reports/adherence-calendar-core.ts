/**
 * Adherence Calendar Core (MB-11 C · SPEC Zero→ATP) — lógica pura del
 * calendario de adherencia con puntos de color por métrica.
 *
 * Regla MB-6 en el modelo de datos: un día distingue tres estados por métrica —
 * `true` (meta cumplida), `false` (hubo registro pero no llegó a la meta) y
 * AUSENTE (sin datos). "Sin datos" y "no cumplió" jamás se pintan igual.
 */

export type MetricKey = 'ayuno' | 'proteina' | 'agua' | 'actividad' | 'sueno';

/** Métricas del calendario en orden de render. `sueno` existe en el modelo
 *  pero hoy no tiene fuente por día (wearable desactivado) → siempre ausente,
 *  y la leyenda lo dice (vacío que informa). */
export const CALENDAR_METRICS: readonly MetricKey[] = [
  'ayuno', 'proteina', 'agua', 'actividad', 'sueno',
];

/** Flags de un día: solo métricas CON registro aparecen como key. */
export type DayFlags = Partial<Record<MetricKey, boolean>>;
export type FlagsByDate = Record<string, DayFlags>;

// ── Reglas de "meta cumplida" por métrica (puras, testeables) ──

/** Ayuno: sesión completada; si tenía meta, cuenta al alcanzarla (con 5% de
 *  tolerancia — terminar en 15.3h un 16:8 arrancado tarde sigue siendo el hábito). */
export function fastingMet(status: string, actualHours: number | null, targetHours: number | null): boolean {
  if (status !== 'completed' || actualHours == null || actualHours <= 0) return false;
  if (targetHours == null || targetHours <= 0) return true;
  return actualHours >= targetHours * 0.95;
}

export function proteinMet(totalG: number, goalG: number): boolean {
  return goalG > 0 && totalG >= goalG;
}

export function waterMet(totalMl: number, targetMl: number): boolean {
  return targetMl > 0 && totalMl >= targetMl;
}

// ── Grid mensual ──

/** Lunes-primero (es-MX). */
export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD sin pasar por Date (evita sorpresas de zona horaria). */
export function dateKey(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Matriz de semanas del mes (filas de 7, lunes primero). Celdas fuera del mes
 * van como null. Cada celda dentro del mes es su día (1..31).
 */
export function buildMonthMatrix(year: number, month0: number): (number | null)[][] {
  const total = daysInMonth(year, month0);
  // getDay(): 0=domingo → índice lunes-primero: (d+6)%7
  const firstCol = (new Date(year, month0, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = Array(firstCol).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Mes anterior/siguiente como par [year, month0]. */
export function shiftMonth(year: number, month0: number, delta: number): [number, number] {
  const d = new Date(year, month0 + delta, 1);
  return [d.getFullYear(), d.getMonth()];
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
