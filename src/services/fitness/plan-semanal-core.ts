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
  /** 20-sep-2026: quién agendó. El coach (assign_routine_to_client) pone su
   *  id; el plan propio pone el del usuario. Decide el copy del hero
   *  ("asignada por tu coach") y, desde A4, la precedencia entre rutinas. */
  assigned_by?: string | null;
  /** A4 (20-sep-2026): dueño de la fila (scheduled_routines.user_id). Con
   *  assigned_by decide si la rutina la agendó el coach. Opcional porque el
   *  caché de un día anterior a esta regla no lo trae: sin él no se adivina. */
  user_id?: string | null;
}

/**
 * A1 (20-sep-2026): assign_routine_to_client (mig 002) clona la rutina del
 * coach con clone_routine sin p_new_name, y clone_routine (mig 232:47) la
 * bautiza `<nombre> (copia)`. El cliente no clonó nada: ve el nombre que le
 * puso su coach. Recorta el sufijo exacto ` (copia)` (repetido, por si la
 * copia venía de otra copia); clone_routine no produce ` (copia 2)`.
 * El arreglo de raíz es pasar p_new_name := name en la migración.
 */
export function nombreRutinaParaCliente(nombre: string | null | undefined): string {
  let n = (nombre ?? '').trim();
  while (n.endsWith(' (copia)')) n = n.slice(0, -' (copia)'.length).trimEnd();
  return n;
}

/**
 * A4 (20-sep-2026): rutina concreta agendada por alguien que no es el dueño
 * de la fila, es decir, su coach. El plan propio (savePlanSemanal) agenda con
 * assigned_by = user_id y el agendado viejo (schedule-service) sin nadie:
 * las dos son propias. Sin user_id en la fila no se adivina: false.
 */
export function esRutinaDeCoach(row: AsignacionRow): boolean {
  if (row.routine_id == null) return false;
  const por = row.assigned_by ?? null;
  const dueno = row.user_id ?? null;
  return por != null && dueno != null && por !== dueno;
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
 *  3. Entre rutinas, primero la del COACH (A4, decisión del dueño 8-sep:
 *     lo que Enrique asigna manda sobre lo que el cliente armó solo, sin
 *     quitarle lo suyo: sigue en Mis rutinas y el hub dice qué desplazó).
 *     Entre dos del mismo origen, la más ANTIGUA (created_at ASC) — estable,
 *     nadie ve su rutina cambiar sola.
 *  4. Entre enfoques: el guardado más NUEVO (created_at DESC) — el último
 *     "Guardar mi plan" es la verdad; los duplicados temporales de B4 se
 *     resuelven solos hacia lo que el usuario acaba de decidir.
 */
export function precedencia(a: AsignacionRow, b: AsignacionRow): number {
  const aRutina = a.routine_id != null ? 0 : 1;
  const bRutina = b.routine_id != null ? 0 : 1;
  if (aRutina !== bRutina) return aRutina - bRutina;
  if (aRutina === 0) {
    const aCoach = esRutinaDeCoach(a) ? 0 : 1;
    const bCoach = esRutinaDeCoach(b) ? 0 : 1;
    if (aCoach !== bCoach) return aCoach - bCoach;
    return tsDe(a).localeCompare(tsDe(b));
  }
  return tsDe(b).localeCompare(tsDe(a));
}

export interface ResolucionHoy {
  /** Lo que toca hoy. null = descanso o plan sin configurar. */
  elegida: AsignacionRow | null;
  /** A4: lo PROPIO del usuario que la rutina del coach desplazó hoy (su
   *  rutina autoagendada o el enfoque de su plan), para que el hub lo diga
   *  en vez de quitárselo en silencio. null si no hay coach de por medio. */
  desplazada: AsignacionRow | null;
}

/**
 * La resolución de HOY: fecha específica gana sobre ciclo semanal; entre
 * las que empatan el día decide `precedencia` (jamás el orden en que
 * Postgres entregó las filas). Si la elegida es del coach, `desplazada` es
 * la mejor de las propias del día (fecha específica antes que semanal, y
 * dentro de cada grupo la misma precedencia).
 */
export function resolverHoy(
  rows: AsignacionRow[] | null,
  hoyLocal: string,
): ResolucionHoy {
  if (!rows || rows.length === 0) return { elegida: null, desplazada: null };
  const activas = rows.filter((r) => r?.is_active && (r.focus != null || r.routine_id != null));
  const especificas = activas
    .filter((r) => r.schedule_type === 'specific_date' && r.specific_date === hoyLocal)
    .sort(precedencia);
  const dow = diaSemanaLocal(hoyLocal);
  const semanales = activas
    .filter((r) => r.schedule_type === 'weekly_cycle' && r.day_of_week === dow)
    .sort(precedencia);
  const elegida = especificas[0] ?? semanales[0] ?? null;
  if (!elegida || !esRutinaDeCoach(elegida)) return { elegida, desplazada: null };
  const propias = [...especificas, ...semanales].filter((r) => r !== elegida && !esRutinaDeCoach(r));
  return { elegida, desplazada: propias[0] ?? null };
}

/** La asignación de HOY (la `elegida` de resolverHoy). null = descanso. */
export function asignacionDeHoy(
  rows: AsignacionRow[] | null,
  hoyLocal: string,
): AsignacionRow | null {
  return resolverHoy(rows, hoyLocal).elegida;
}

/** A4: lo propio que la rutina del coach desplazó hoy; null si nada. */
export function desplazadaDeHoy(
  rows: AsignacionRow[] | null,
  hoyLocal: string,
): AsignacionRow | null {
  return resolverHoy(rows, hoyLocal).desplazada;
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
