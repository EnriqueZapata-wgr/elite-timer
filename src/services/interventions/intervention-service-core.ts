/**
 * intervention-service-core — lógica PURA de la capa de servicio de intervenciones
 * (Fase 3). Sin react-native/supabase → testeable con vitest.
 *
 * Aquí vive lo determinístico del sync y del ordenamiento:
 *  - planSuggestedInserts: qué filas insertar en user_interventions dado el match
 *    del motor y lo que el user YA tiene (idempotente: nunca pisa filas existentes,
 *    un 'dismissed' no renace).
 *  - planComputedTimeUpdates: refresco de computed_time de universales circadianos
 *    cuando el cronotipo cambió (no toca status ni overrides del user).
 *  - resolveRows / sortProtocol / sortSuggested: mapeo fila→definición y orden UI.
 *
 * El I/O (Supabase, electrones, eventos) vive en intervention-service.ts.
 */
import {
  computeUniversalTime,
  resolveInterventionDef,
  type ChronotypeSchedule,
  type MatchResult,
  type ResolvedInterventionDef,
} from './intervention-engine-core';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';

// ── Tipos de fila (shape de user_interventions, migración 171) ───────────────

export type InterventionStatus = 'suggested' | 'active' | 'paused' | 'dismissed';

export interface UserInterventionRow {
  id: string;
  user_id: string;
  intervention_key: string;
  status: InterventionStatus;
  priority: number;
  source_dx_id: string | null;
  is_custom: boolean;
  is_universal: boolean;
  custom_definition: Partial<ResolvedInterventionDef> | null;
  custom_time: string | null;
  computed_time: string | null;
  custom_notes: string | null;
  custom_dose: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  /**
   * 8-oct-2026 (nivel 2, migración 329): quién asignó esta práctica desde el
   * programa (elite_v3.practicas). null = es de la persona o del motor.
   * OPCIONAL a propósito: la app sale (OTA) antes de que la migración se
   * aplique, y una base sin la columna devuelve filas sin este campo. Ausente
   * se lee igual que null: no asignada. Preguntar siempre con
   * `esPracticaAsignada`, nunca con `row.assigned_by != null` a mano.
   */
  assigned_by?: string | null;
}

/** Fila resuelta contra el catálogo/custom_definition, lista para la UI. */
export interface ResolvedUserIntervention {
  row: UserInterventionRow;
  def: ResolvedInterventionDef;
  /** Score del motor (solo sugeridas curadas con match; 0 en universales/custom). */
  score: number;
}

// ── Sync: qué insertar ───────────────────────────────────────────────────────

export interface SuggestedInsert {
  user_id: string;
  intervention_key: string;
  status: 'suggested';
  priority: number;
  is_universal: boolean;
  source_dx_id: string | null;
  computed_time: string | null;
}

/**
 * Calcula las filas nuevas a insertar: universales + sugeridas del match que el
 * user aún NO tiene. Idempotente por diseño: cualquier key ya presente (sea cual
 * sea su status — dismissed incluido) se respeta y NO se re-inserta.
 * Universales también entran como 'suggested' (el user activa; doctrina sin límite).
 */
export function planSuggestedInserts(
  userId: string,
  match: MatchResult,
  existingKeys: Iterable<string>,
  dxId: string | null,
  schedule: ChronotypeSchedule,
): SuggestedInsert[] {
  const existing = new Set(existingKeys);
  const inserts: SuggestedInsert[] = [];

  for (const iv of match.universals) {
    if (existing.has(iv.key)) continue;
    inserts.push({
      user_id: userId,
      intervention_key: iv.key,
      status: 'suggested',
      priority: iv.priority,
      is_universal: true,
      source_dx_id: null, // universales no dependen del DX
      computed_time: iv.circadian ? computeUniversalTime(iv.circadian, schedule) : null,
    });
  }

  for (const s of match.suggestions) {
    const iv = s.intervention;
    if (existing.has(iv.key)) continue;
    inserts.push({
      user_id: userId,
      intervention_key: iv.key,
      status: 'suggested',
      priority: iv.priority,
      is_universal: false,
      source_dx_id: dxId,
      computed_time: null,
    });
  }

  return inserts;
}

/**
 * Refresco de computed_time de universales circadianos existentes cuando el
 * cronotipo cambió. Solo devuelve diffs reales (no toca status/overrides).
 */
export function planComputedTimeUpdates(
  rows: Pick<UserInterventionRow, 'id' | 'intervention_key' | 'is_universal' | 'is_custom' | 'computed_time'>[],
  schedule: ChronotypeSchedule,
): { id: string; computed_time: string | null }[] {
  const updates: { id: string; computed_time: string | null }[] = [];
  for (const row of rows) {
    if (!row.is_universal || row.is_custom) continue;
    const cat = INTERVENTION_BY_KEY[row.intervention_key];
    if (!cat?.circadian) continue;
    const fresh = computeUniversalTime(cat.circadian, schedule);
    if (fresh !== (row.computed_time ?? null)) {
      updates.push({ id: row.id, computed_time: fresh });
    }
  }
  return updates;
}

// ── Mapeo fila → definición + orden UI ───────────────────────────────────────

/**
 * Resuelve filas contra catálogo/custom_definition. Filas irresolubles (key
 * desconocido sin custom_definition = dato corrupto) se descartan. Si se pasa el
 * match del motor, adjunta el score de cada sugerida curada.
 */
export function resolveRows(
  rows: UserInterventionRow[],
  match?: MatchResult,
): ResolvedUserIntervention[] {
  const scoreByKey = new Map<string, number>();
  if (match) {
    for (const s of match.suggestions) scoreByKey.set(s.intervention.key, s.score);
  }
  const out: ResolvedUserIntervention[] = [];
  for (const row of rows) {
    const def = resolveInterventionDef(row);
    if (!def) continue;
    out.push({ row, def, score: scoreByKey.get(row.intervention_key) ?? 0 });
  }
  return out;
}

/** Orden de "Mi Protocolo": semáforo (priority asc 🔴→🟢), luego nombre. */
export function sortProtocol(list: ResolvedUserIntervention[]): ResolvedUserIntervention[] {
  return [...list].sort((a, b) => {
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
}

/**
 * Orden de "Sugeridas para ti": universales primero (son la base garantizada),
 * luego curadas por score del motor desc; empates por priority asc y nombre.
 */
// 7-sep-2026 (pivote limpio): sin pantalla desde que se retiró la lista de
// sugeridas. Se conserva a propósito como el orden del motor (ver la nota de
// getSuggestedInterventions en intervention-service.ts). No es código huérfano
// por descuido: es una decisión escrita, con fecha.
export function sortSuggested(list: ResolvedUserIntervention[]): ResolvedUserIntervention[] {
  return [...list].sort((a, b) => {
    if (a.row.is_universal !== b.row.is_universal) return a.row.is_universal ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
}

// ── A.3 megahotfix 3ra pasada: motor saturado → top acotado ──────────────────

/** Tamaño del top de sugeridas visible por default (doctrina: 10-15). */
export const SUGGESTED_TOP_COUNT = 12;

// ── 1.5-D: universales P1 siempre visibles + umbrales UX progresiva ──────────

/**
 * Orden de "Mi Protocolo" para display: universales P1 SIEMPRE arriba (son la
 * base no negociable — sol, hidratación, sueño, ventana, grounding...), luego
 * el resto por semáforo (priority asc) y nombre.
 */
export function orderProtocolForDisplay(list: ResolvedUserIntervention[]): ResolvedUserIntervention[] {
  return [...list].sort((a, b) => {
    if (a.row.is_universal !== b.row.is_universal) return a.row.is_universal ? -1 : 1;
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
}

export type ProtocolLoadHint = 'none' | 'soft' | 'strong';

/** Umbrales Humby sobre el TOTAL de activas (universales incluidas). */
export const PROTOCOL_SOFT_MIN = 6;
export const PROTOCOL_STRONG_MIN = 9;

/**
 * UX progresiva de carga (doctrina Humby, sin límite duro):
 * 1-5 activas → sin hint · 6-8 → hint suave · 9+ → warning claro.
 * HOTFIX 1.5: el umbral cuenta el TOTAL de activas — la carga real del día
 * incluye a las universales (device test: 7 activas debían disparar el hint;
 * la versión que excluía universales nunca lo mostraba).
 */
export function protocolLoadHint(list: ResolvedUserIntervention[]): {
  hint: ProtocolLoadHint;
  activeCount: number;
} {
  const activeCount = list.length;
  const hint: ProtocolLoadHint = activeCount >= PROTOCOL_STRONG_MIN
    ? 'strong'
    : activeCount >= PROTOCOL_SOFT_MIN
      ? 'soft'
      : 'none';
  return { hint, activeCount };
}

/**
 * Parte las sugeridas en top visible + resto colapsado ("Ver todas (N más)").
 * Las universales entran TODAS al top (jamás se pierden entre las curadas,
 * aunque excedan topCount); las curadas llenan los slots restantes en el orden
 * de sortSuggested (score desc, priority asc).
 */
export function partitionSuggested(
  list: ResolvedUserIntervention[],
  topCount: number = SUGGESTED_TOP_COUNT,
): { top: ResolvedUserIntervention[]; rest: ResolvedUserIntervention[] } {
  const sorted = sortSuggested(list);
  const universals = sorted.filter((s) => s.row.is_universal);
  const curated = sorted.filter((s) => !s.row.is_universal);
  const slots = Math.max(0, topCount - universals.length);
  return {
    top: [...universals, ...curated.slice(0, slots)],
    rest: curated.slice(slots),
  };
}

/** Hora efectiva a mostrar/agendar: override del user gana al cálculo circadiano. */
export function effectiveTime(row: Pick<UserInterventionRow, 'custom_time' | 'computed_time'>): string | null {
  return row.custom_time ?? row.computed_time ?? null;
}

/** Valida un 'HH:MM' de 24h (para custom_time del detalle). */
export function isValidHHMM(value: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

// ── 8-oct-2026 (nivel 2): prácticas asignadas por el coach ───────────────────

/**
 * ¿Esta práctica la fijó el coach desde el programa? Regla del dueño "lo suyo
 * sí, lo tuyo no": una práctica asignada se consulta y se pausa, y su hora la
 * ajusta el coach. Una práctica propia (o del motor) se edita como siempre.
 *
 * Solo `assigned_by` con un id real cuenta. Ausente (base anterior a la 329, o
 * lectura que cayó al select viejo), null o vacío = no asignada. No mira el
 * status: una asignada en pausa sigue siendo asignada.
 */
export function esPracticaAsignada(
  row: { assigned_by?: string | null } | null | undefined,
): boolean {
  const quien = row?.assigned_by;
  return typeof quien === 'string' && quien.trim() !== '';
}

/** Columna que agrega la migración 329. Puede no existir todavía en la base. */
export const COLUMNA_ASIGNACION = 'assigned_by';

/** Columnas de user_interventions que existen desde la 171 (siempre seguras). */
export const COLUMNAS_FILA_SIN_ASIGNACION =
  'id, user_id, intervention_key, status, priority, source_dx_id, is_custom, is_universal, ' +
  'custom_definition, custom_time, computed_time, custom_notes, custom_dose, activated_at, created_at, updated_at';

/** Las mismas más `assigned_by` (329). Es el select que la app pide primero. */
export const COLUMNAS_FILA = `${COLUMNAS_FILA_SIN_ASIGNACION}, ${COLUMNA_ASIGNACION}`;

/** Lo que devuelve una lectura de supabase-js: nunca lanza en 4xx. */
export interface ErrorDeLectura {
  code?: string | null;
  message?: string | null;
}
export interface RespuestaDeLectura<T> {
  data: T | null;
  error: ErrorDeLectura | null;
}

/**
 * ¿El error es "esa columna todavía no existe"? PostgREST lo dice de dos
 * formas: 42703 cuando la columna va en el `select` ("column
 * user_interventions.assigned_by does not exist") y PGRST204 cuando va en el
 * cuerpo de una escritura ("Could not find the 'assigned_by' column ... in the
 * schema cache"). Se exige que el mensaje nombre ESTA columna: un 42703 de
 * otra columna es un error de verdad y no se disfraza.
 */
export function esErrorDeColumnaFaltante(
  error: ErrorDeLectura | null | undefined,
  columna: string = COLUMNA_ASIGNACION,
): boolean {
  if (!error) return false;
  const code = String(error.code ?? '');
  const msg = String(error.message ?? '');
  const porCodigo = code === '42703' || code === 'PGRST204';
  const porTexto = /42703|PGRST204|schema cache|does not exist/i.test(msg);
  if (!porCodigo && !porTexto) return false;
  // Sin mensaje solo queda el código. Con mensaje, tiene que nombrar la columna.
  if (msg.trim() === '') return porCodigo;
  return msg.toLowerCase().includes(columna.toLowerCase());
}

function sinAsignar<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((f) => (f && typeof f === 'object' ? { ...f, [COLUMNA_ASIGNACION]: null } : f)) as unknown as T;
  }
  if (data && typeof data === 'object') return { ...data, [COLUMNA_ASIGNACION]: null };
  return data;
}

/**
 * Lee filas de user_interventions pidiendo `assigned_by`, con caída para la
 * ventana en que la app ya salió y la migración 329 todavía no se aplica
 * (mismo problema que "sinCampos312" en app/supplements.tsx, del lado de la
 * lectura): si la base responde que la columna no existe, se reintenta UNA vez
 * con el select de siempre y cada fila se marca como no asignada.
 *
 * `leer` recibe la lista de columnas y arma la consulta (así este archivo
 * sigue sin importar supabase). Reglas:
 *  - Cualquier otro error se devuelve tal cual, sin reintento.
 *  - Si el reintento también falla, se devuelve ESE error.
 *  - Nunca convierte un error en lista vacía: `data` va en null junto al error
 *    y es quien llama el que decide. "No se pudo leer" no es "no hay".
 */
export async function leerConCaidaDeAsignacion<T>(
  leer: (columnas: string) => PromiseLike<RespuestaDeLectura<T>>,
): Promise<RespuestaDeLectura<T> & { sinColumnaAsignacion: boolean }> {
  const primera = await leer(COLUMNAS_FILA);
  if (!primera.error) return { data: primera.data, error: null, sinColumnaAsignacion: false };
  if (!esErrorDeColumnaFaltante(primera.error)) {
    return { data: null, error: primera.error, sinColumnaAsignacion: false };
  }
  const segunda = await leer(COLUMNAS_FILA_SIN_ASIGNACION);
  if (segunda.error) return { data: null, error: segunda.error, sinColumnaAsignacion: true };
  return {
    data: segunda.data == null ? segunda.data : sinAsignar(segunda.data),
    error: null,
    sinColumnaAsignacion: true,
  };
}
