/**
 * plan-semanal-core (MB-27 Pieza 2) — la asignación del día, pura.
 *
 * "Que el usuario diga UNA vez qué días entrena qué, y que la app se lo
 * asigne." Las filas viven en scheduled_routines (mig 001 + 257): weekly por
 * day_of_week o specific_date, con `focus` (enfoque del generador) o
 * `routine_id` (rutina guardada).
 *
 * ⚠️ La resolución de "hoy" es LOCAL a propósito (mutación 7): el RPC
 * get_today_routines usa CURRENT_DATE del servidor — a las 7pm de CDMX ya es
 * mañana en UTC y contestaría el día equivocado. Aquí el día de la semana
 * sale de parseLocalDate(getLocalToday()), nunca del reloj del servidor.
 *
 * ⚠️ La asignación NO acredita el electrón strength (es verificado: cumplir
 * es entrenar de verdad, exercise_logs con fecha). Nada de este módulo toca
 * ledger, estados ni prefs.
 */
import { parseLocalDate } from '@/src/utils/date-helpers';

export type EnfoquePlan =
  | 'full_body' | 'tren_superior' | 'empuje' | 'traccion'
  | 'pierna_empuje' | 'pierna_traccion';

export const ENFOQUES_PLAN: readonly EnfoquePlan[] = [
  'full_body', 'tren_superior', 'empuje', 'traccion', 'pierna_empuje', 'pierna_traccion',
];

export const ENFOQUE_LABELS: Record<EnfoquePlan, string> = {
  full_body: 'Full body',
  tren_superior: 'Tren superior',
  empuje: 'Empuje',
  traccion: 'Tracción',
  pierna_empuje: 'Pierna y empuje',
  pierna_traccion: 'Pierna y tracción',
};

export function esEnfoquePlan(v: unknown): v is EnfoquePlan {
  return typeof v === 'string' && (ENFOQUES_PLAN as readonly string[]).includes(v);
}

/** 0=domingo … 6=sábado (mismo convenio que Date.getDay y el DOW de Postgres). */
export const DIA_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

/** Orden de render: la semana del usuario empieza en lunes. */
export const DIAS_ORDEN_UI: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** Día de la semana de una fecha 'YYYY-MM-DD' en LOCAL (jamás UTC). */
export function diaSemanaLocal(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/** Fila de scheduled_routines como la lee el plan (subset relevante). */
export interface AsignacionRow {
  id?: string;
  schedule_type: 'weekly_cycle' | 'specific_date';
  day_of_week: number | null;
  specific_date: string | null;
  focus: string | null;
  routine_id: string | null;
  routine_name?: string | null;
  is_active: boolean;
  /** Para el desempate determinista (audit B7). */
  created_at?: string | null;
}

const tsDe = (r: AsignacionRow): string => r.created_at ?? '';

/**
 * Audit B7 — LA regla de precedencia, explícita y determinista:
 *
 *  1. Fecha específica gana sobre ciclo semanal (estructural, abajo).
 *  2. Una RUTINA concreta (routine_id — del coach o autoagendada) gana
 *     sobre un ENFOQUE (patrón genérico): lo específico manda sobre lo
 *     genérico, y la pantalla del plan lo dice en el día para que no sea
 *     silencioso. El usuario siempre tiene la salida (cambiar su plan o
 *     quitar la rutina).
 *  3. Entre rutinas: la más ANTIGUA (created_at ASC) — estable, nadie ve
 *     su rutina cambiar sola.
 *  4. Entre enfoques: el guardado más NUEVO (created_at DESC) — el último
 *     "Guardar mi plan" es la verdad; los duplicados temporales de B4 se
 *     resuelven solos hacia lo que el usuario acaba de decidir.
 */
export function precedencia(a: AsignacionRow, b: AsignacionRow): number {
  const aRutina = a.routine_id != null ? 0 : 1;
  const bRutina = b.routine_id != null ? 0 : 1;
  if (aRutina !== bRutina) return aRutina - bRutina;
  if (aRutina === 0) return tsDe(a).localeCompare(tsDe(b));
  return tsDe(b).localeCompare(tsDe(a));
}

/**
 * La asignación de HOY: fecha específica gana sobre ciclo semanal; entre
 * las que empatan el día decide `precedencia` (jamás el orden en que
 * Postgres entregó las filas). null = descanso o plan sin configurar.
 */
export function asignacionDeHoy(
  rows: AsignacionRow[] | null,
  hoyLocal: string,
): AsignacionRow | null {
  if (!rows || rows.length === 0) return null;
  const activas = rows.filter((r) => r?.is_active && (r.focus != null || r.routine_id != null));
  const especificas = activas
    .filter((r) => r.schedule_type === 'specific_date' && r.specific_date === hoyLocal)
    .sort(precedencia);
  if (especificas.length > 0) return especificas[0];
  const dow = diaSemanaLocal(hoyLocal);
  const semanales = activas
    .filter((r) => r.schedule_type === 'weekly_cycle' && r.day_of_week === dow)
    .sort(precedencia);
  return semanales[0] ?? null;
}

export interface ProximaAsignacion {
  row: AsignacionRow;
  /** 'YYYY-MM-DD' del día que toca. */
  date: string;
  /** Días desde hoy (1 = mañana). */
  enDias: number;
}

/** Suma días a una fecha local 'YYYY-MM-DD' sin tocar UTC. */
function sumarDias(dateStr: string, dias: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + dias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** La siguiente asignación dentro de los próximos 7 días (para el descanso). */
export function proximaAsignacion(
  rows: AsignacionRow[] | null,
  hoyLocal: string,
): ProximaAsignacion | null {
  if (!rows || rows.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const fecha = sumarDias(hoyLocal, i);
    const row = asignacionDeHoy(rows, fecha);
    if (row) return { row, date: fecha, enDias: i };
  }
  return null;
}

/** El texto del hero: qué toca hoy. */
export function tituloDeAsignacion(row: AsignacionRow): string {
  if (row.focus && esEnfoquePlan(row.focus)) return ENFOQUE_LABELS[row.focus];
  return row.routine_name?.trim() || 'Tu rutina asignada';
}

/** El plan semanal como lo edita la UI: dow → enfoque. */
export type PlanSemanal = Partial<Record<number, EnfoquePlan>>;

/** Filas weekly de enfoque → plan editable (ignora filas de rutina/coach).
 *  Audit B7: con duplicados (poda fallida de B4) gana el guardado más
 *  nuevo — la misma regla de `precedencia`, no el orden de la query. */
export function planDeFilas(rows: AsignacionRow[] | null): PlanSemanal {
  const plan: PlanSemanal = {};
  const enfoques = (rows ?? [])
    .filter((r) =>
      r?.is_active &&
      r.schedule_type === 'weekly_cycle' &&
      r.day_of_week != null &&
      esEnfoquePlan(r.focus),
    )
    .sort(precedencia);
  for (const r of enfoques) {
    if (plan[r.day_of_week!] === undefined) plan[r.day_of_week!] = r.focus as EnfoquePlan;
  }
  return plan;
}

/**
 * Audit B7 (relacionado): las rutinas concretas agendadas por día de la
 * semana (coach o autoagendadas), para que /plan-entrenamiento las DIGA en
 * vez de pintar "Descanso" sobre un día que sí tiene asignación — y para
 * decir que ese día la rutina manda sobre el enfoque.
 */
export function rutinasPorDia(rows: AsignacionRow[] | null): Partial<Record<number, string>> {
  const out: Partial<Record<number, string>> = {};
  const rutinas = (rows ?? [])
    .filter((r) =>
      r?.is_active &&
      r.schedule_type === 'weekly_cycle' &&
      r.day_of_week != null &&
      r.routine_id != null,
    )
    .sort(precedencia);
  for (const r of rutinas) {
    if (out[r.day_of_week!] === undefined) {
      out[r.day_of_week!] = r.routine_name?.trim() || 'Rutina asignada';
    }
  }
  return out;
}
