/**
 * today-session-core (20-sep-2026): la decisión de "qué es hoy" en Fitness,
 * pura y testeable, separada del I/O de today-session-service.
 *
 * POR QUÉ existe: un cliente Elite entra el día uno con una rutina que le
 * asignó su coach (scheduled_routines.assigned_by = coach) y el hub le
 * preguntaba "¿Cuál es tu nivel?" y luego "Genera tu sesión": el servicio
 * contestaba primer_uso / sin_prefs ANTES de mirar la asignación. Aquí la
 * rutina agendada (del coach o propia) gana sobre el onboarding del
 * generador, y un Tabata o un cardio registrado marcan el día como entrenado
 * aunque no exista workout_session (el runner de intervalos escribe en
 * cardio_sessions 'other', no en workout_sessions).
 */
import { nombreRutinaParaCliente, type AsignacionRow } from './plan-semanal-core';

export interface SesionHoyLite {
  routine_name: string | null;
}

export interface CardioHoyLite {
  discipline: string;
  notes: string | null;
}

export type DecisionHoy =
  /** Hoy ya se entrenó (fuerza o cardio). Si además había rutina agendada
   *  que no se ve cumplida, se conserva para ofrecerla sin nagging. */
  | { kind: 'entrenado'; asignadaPendiente: AsignacionRow | null }
  /** Hay una rutina concreta agendada para hoy y todavía no se hizo.
   *  A4: `desplazada` es lo propio que la rutina del coach desplazó hoy
   *  (el hub lo dice en una línea); null si no la agendó el coach. */
  | { kind: 'asignada'; asignacion: AsignacionRow; porCoach: boolean; desplazada: AsignacionRow | null }
  | { kind: 'primer_uso' }
  | { kind: 'sin_prefs' }
  /** Hay nivel y prefs: el servicio genera la sesión determinista del día. */
  | { kind: 'generar' };

export interface EntradaDecision {
  userId: string;
  sesion: SesionHoyLite | null;
  cardioHoy: CardioHoyLite[];
  nivel: string | null;
  tienePrefs: boolean;
  asignacion: AsignacionRow | null;
  /** A4: lo propio que la asignación del coach desplazó (resolverHoy). */
  desplazada?: AsignacionRow | null;
}

/** Una rutina concreta (routine_id) agendada por alguien que no es el propio
 *  usuario: el coach. El plan propio (savePlanSemanal) se agenda con
 *  assigned_by = user_id y el agendado viejo (schedule-service) sin nadie. */
export function esAsignadaPorCoach(row: AsignacionRow | null, userId: string): boolean {
  if (!row || row.routine_id == null) return false;
  const por = row.assigned_by ?? null;
  return por != null && por !== userId;
}

/** A1: los dos lados se comparan sin el sufijo " (copia)" del clon del coach:
 *  la fila del plan ya llega recortada y la sesión pudo guardarse con el
 *  nombre crudo (abierta desde Mis rutinas). */
const nombreDe = (row: AsignacionRow): string => nombreRutinaParaCliente(row.routine_name);

/**
 * ¿La rutina agendada ya se ejecutó hoy? Se reconoce por NOMBRE porque es lo
 * único que dejan las dos rutas de guardado: /session escribe
 * workout_sessions.routine_name con el nombre de la rutina, y el runner de
 * intervalos escribe cardio_sessions 'other' con notes "<nombre> · N steps ·
 * ...". Sin nombre en la fila no hay forma honesta de saberlo: false.
 */
export function rutinaAsignadaCumplida(
  row: AsignacionRow | null,
  sesion: SesionHoyLite | null,
  cardioHoy: CardioHoyLite[],
): boolean {
  if (!row || row.routine_id == null) return false;
  const nombre = nombreDe(row);
  if (!nombre) return false;
  if (sesion && nombreRutinaParaCliente(sesion.routine_name) === nombre) return true;
  return cardioHoy.some((c) =>
    c.discipline === 'other' && typeof c.notes === 'string' && c.notes.includes(' · ')
    && nombreRutinaParaCliente(c.notes.split(' · ')[0]) === nombre);
}

/**
 * LA regla, en orden:
 *  1. Ya hay sesión de fuerza hoy → entrenado (la rutina agendada, si no se
 *     reconoce cumplida, se ofrece en quiet; no se vuelve a exigir).
 *  2. Hay rutina agendada y no se ve cumplida → asignada, aunque haya cardio
 *     hoy: un calentamiento de intervalos no sustituye la rutina del coach.
 *  3. Hay cardio hoy (rutina cumplida o sin rutina) → entrenado.
 *  4. Sin nivel → primer_uso. Sin prefs → sin_prefs. Si no → generar.
 */
export function decidirHoy(e: EntradaDecision): DecisionHoy {
  const rutinaHoy = e.asignacion?.routine_id != null ? e.asignacion : null;
  const cumplida = rutinaAsignadaCumplida(rutinaHoy, e.sesion, e.cardioHoy);
  const pendiente = rutinaHoy && !cumplida ? rutinaHoy : null;

  if (e.sesion) return { kind: 'entrenado', asignadaPendiente: pendiente };
  if (pendiente) {
    const porCoach = esAsignadaPorCoach(pendiente, e.userId);
    return { kind: 'asignada', asignacion: pendiente, porCoach, desplazada: porCoach ? (e.desplazada ?? null) : null };
  }
  if (e.cardioHoy.length > 0) return { kind: 'entrenado', asignadaPendiente: null };
  if (!e.nivel) return { kind: 'primer_uso' };
  if (!e.tienePrefs) return { kind: 'sin_prefs' };
  return { kind: 'generar' };
}

/**
 * Días distintos entrenados en la semana: unión por fecha local de
 * workout_sessions y cardio_sessions. Una sesión que escribió en las dos
 * tablas (cardio adoptado por la sesión de fuerza) cuenta UN día, porque se
 * cuenta por fecha y no por fila.
 */
export function diasEntrenados(fechasFuerza: readonly string[], fechasCardio: readonly string[]): number {
  const dias = new Set<string>();
  for (const f of fechasFuerza) if (f) dias.add(String(f).slice(0, 10));
  for (const f of fechasCardio) if (f) dias.add(String(f).slice(0, 10));
  return dias.size;
}

/** Primer nombre de "Enrique Zapata" → "Enrique"; vacío o nulo → null. */
export function primerNombre(full: string | null | undefined): string | null {
  const limpio = (full ?? '').trim();
  if (!limpio) return null;
  return limpio.split(/\s+/)[0];
}
