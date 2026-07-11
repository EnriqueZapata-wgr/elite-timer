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
export function sortSuggested(list: ResolvedUserIntervention[]): ResolvedUserIntervention[] {
  return [...list].sort((a, b) => {
    if (a.row.is_universal !== b.row.is_universal) return a.row.is_universal ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.row.priority !== b.row.priority) return a.row.priority - b.row.priority;
    return a.def.name.localeCompare(b.def.name);
  });
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
