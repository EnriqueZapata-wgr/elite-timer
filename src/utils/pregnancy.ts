/**
 * Máscara ATP Embarazo — derivación de semana gestacional y trimestre (MB-7).
 *
 * Especificado en la migración 080 (`src/utils/pregnancy.ts`) pero nunca
 * construido. El trimestre/semana se DERIVA aquí en cliente desde `due_date`
 * (no se persiste → evita drift). Embarazo a término = 40 semanas contadas
 * desde la FUM; la fecha probable de parto (FPP/due_date) es FUM + 280 días.
 *
 * Núcleo PURO (sin RN/supabase): recibe fechas ISO ya leídas.
 * Sensibilidad: cero lenguaje alarmista o de riesgo — solo la etapa.
 */

export interface PregnancyStatus {
  is_pregnant?: boolean;
  /** ISO 'YYYY-MM-DD' — fecha probable de parto. */
  due_date?: string | null;
  /** ISO 'YYYY-MM-DD' — inicio (FUM), opcional. */
  start_date?: string | null;
}

export interface PregnancyProgress {
  /** Semana gestacional 0-40+ (clamp a 0). */
  week: number;
  /** Día dentro de la semana (0-6). */
  dayOfWeek: number;
  /** Trimestre 1-3. */
  trimester: 1 | 2 | 3;
  /** Días restantes hasta la FPP (0 si ya pasó). */
  daysToDue: number;
  /** Etiqueta cálida y neutra, p.ej. "Semana 24 · 2º trimestre". */
  label: string;
}

const GESTATION_DAYS = 280; // 40 semanas
const MS_DAY = 86400000;

/** Parsea 'YYYY-MM-DD' a Date local a medianoche. null si inválida. */
function parseISO(d: string | null | undefined): Date | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(dt.getTime()) ? null : dt;
}

function trimesterOf(week: number): 1 | 2 | 3 {
  if (week < 13) return 1;
  if (week < 27) return 2;
  return 3;
}

/**
 * Progreso del embarazo a partir del estado y "hoy".
 *
 * Prioriza `start_date` (FUM) si está; si no, deriva la FUM de `due_date − 280d`.
 * Devuelve null si no hay is_pregnant o no hay ninguna fecha usable (sin fecha
 * NO se inventa una etapa).
 *
 * @param status estado de embarazo (cycle_settings.pregnancy_status).
 * @param now    fecha de referencia (inyectable para tests).
 */
export function derivePregnancyProgress(
  status: PregnancyStatus | null | undefined,
  now: Date,
): PregnancyProgress | null {
  if (!status?.is_pregnant) return null;

  const due = parseISO(status.due_date);
  const startExplicit = parseISO(status.start_date);
  // FUM: explícita, o due_date − 280 días.
  const start = startExplicit ?? (due ? new Date(due.getTime() - GESTATION_DAYS * MS_DAY) : null);
  if (!start) return null;

  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / MS_DAY));
  const week = Math.floor(elapsedDays / 7);
  const dayOfWeek = elapsedDays % 7;
  const trimester = trimesterOf(week);

  const dueDate = due ?? new Date(start.getTime() + GESTATION_DAYS * MS_DAY);
  const daysToDue = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / MS_DAY));

  return {
    week, dayOfWeek, trimester, daysToDue,
    label: `Semana ${week} · ${trimester}º trimestre`,
  };
}
