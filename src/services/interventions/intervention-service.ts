/**
 * intervention-service — capa de I/O del motor de Intervenciones (Fase 3).
 *
 * Doctrina Humby: el match es determinístico (intervention-engine-core), SIN IA.
 * Este servicio solo lee el DX vigente, persiste el resultado del motor en
 * user_interventions (idempotente, nunca pisa el status del user), maneja los
 * cambios de estado (activar/pausar/descartar/ajustar) y el log de compleciones
 * con electrón (reuso de awardBooleanElectron — regla #5 CLAUDE.md).
 *
 * La lógica pura (plan de inserts, orden, mapeo) vive en intervention-service-core.ts.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { getCurrentDX } from '@/src/services/dx/dx-service';
import {
  matchInterventions,
  type ChronotypeSchedule,
  type DxRoot,
  type MatchResult,
} from './intervention-engine-core';
import {
  planComputedTimeUpdates,
  planSuggestedInserts,
  resolveRows,
  sortProtocol,
  sortSuggested,
  type ResolvedUserIntervention,
  type UserInterventionRow,
} from './intervention-service-core';

const ROW_COLUMNS =
  'id, user_id, intervention_key, status, priority, source_dx_id, is_custom, is_universal, ' +
  'custom_definition, custom_time, computed_time, custom_notes, custom_dose, activated_at, created_at, updated_at';

/** Evento de UI: cualquier cambio en user_interventions / compleciones. */
export const INTERVENTIONS_CHANGED_EVENT = 'interventions_changed';

function emitChanged() {
  DeviceEventEmitter.emit(INTERVENTIONS_CHANGED_EVENT);
}

// ── Cronotipo (reuso de user_chronotype, mismo shape que day-compiler) ───────

/** Lee el horario del cronotipo del user (schedule JSONB con fallback a columna). */
export async function getChronotypeSchedule(userId: string): Promise<ChronotypeSchedule> {
  try {
    const { data } = await supabase
      .from('user_chronotype')
      .select('schedule, sleep_time')
      .eq('user_id', userId)
      .maybeSingle();
    const schedule = (data as any)?.schedule ?? {};
    return {
      wake_time: schedule?.wake_time ?? null,
      sleep_time: schedule?.sleep_time ?? (data as any)?.sleep_time ?? null,
    };
  } catch {
    return { wake_time: null, sleep_time: null };
  }
}

// ── Match del motor (DX vigente → MatchResult) ───────────────────────────────

async function getMatchForUser(userId: string): Promise<{ match: MatchResult; dxId: string | null }> {
  const dx = await getCurrentDX(userId).catch(() => null);
  const roots = (dx?.roots_detected ?? []) as DxRoot[];
  return { match: matchInterventions(roots), dxId: dx?.id ?? null };
}

// ── Sync: motor → user_interventions (idempotente) ───────────────────────────

/**
 * Corre el motor contra el DX vigente y persiste como 'suggested' las curadas +
 * universales que el user aún no tiene. NUNCA pisa filas existentes (un
 * 'dismissed' no renace; overrides y status del user se respetan). Además
 * refresca computed_time de universales circadianos si el cronotipo cambió.
 */
export async function syncSuggestedInterventions(
  userId: string,
): Promise<{ inserted: number; timeUpdates: number }> {
  const [{ match, dxId }, schedule] = await Promise.all([
    getMatchForUser(userId),
    getChronotypeSchedule(userId),
  ]);

  const { data: existing } = await supabase
    .from('user_interventions')
    .select('id, intervention_key, is_universal, is_custom, computed_time')
    .eq('user_id', userId);
  const existingRows = (existing ?? []) as Pick<
    UserInterventionRow,
    'id' | 'intervention_key' | 'is_universal' | 'is_custom' | 'computed_time'
  >[];

  const inserts = planSuggestedInserts(
    userId,
    match,
    existingRows.map((r) => r.intervention_key),
    dxId,
    schedule,
  );

  let inserted = 0;
  if (inserts.length > 0) {
    // upsert ignoreDuplicates: carrera con otro device → la fila existente gana (no se pisa).
    const { error } = await supabase
      .from('user_interventions')
      .upsert(inserts, { onConflict: 'user_id,intervention_key', ignoreDuplicates: true });
    if (!error) inserted = inserts.length;
  }

  // Refresco quirúrgico de computed_time (universales circadianos ya existentes).
  const timeUpdates = planComputedTimeUpdates(existingRows, schedule);
  for (const u of timeUpdates) {
    await supabase
      .from('user_interventions')
      .update({ computed_time: u.computed_time, updated_at: new Date().toISOString() })
      .eq('id', u.id)
      .eq('user_id', userId);
  }

  if (inserted > 0 || timeUpdates.length > 0) emitChanged();
  return { inserted, timeUpdates: timeUpdates.length };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

/** "Mi Protocolo" = activas resueltas, ordenadas por semáforo (priority asc). */
export async function getMyProtocol(userId: string): Promise<ResolvedUserIntervention[]> {
  const { data } = await supabase
    .from('user_interventions')
    .select(ROW_COLUMNS)
    .eq('user_id', userId)
    .eq('status', 'active');
  return sortProtocol(resolveRows((data ?? []) as unknown as UserInterventionRow[]));
}

/** Sugeridas resueltas + score/orden del motor (universales primero como base). */
export async function getSuggestedInterventions(userId: string): Promise<ResolvedUserIntervention[]> {
  const [{ match }, { data }] = await Promise.all([
    getMatchForUser(userId),
    supabase.from('user_interventions').select(ROW_COLUMNS).eq('user_id', userId).eq('status', 'suggested'),
  ]);
  return sortSuggested(resolveRows((data ?? []) as unknown as UserInterventionRow[], match));
}

/** Una intervención del user por key (para el detalle). null si no la tiene. */
export async function getUserIntervention(
  userId: string,
  key: string,
): Promise<ResolvedUserIntervention | null> {
  const { data } = await supabase
    .from('user_interventions')
    .select(ROW_COLUMNS)
    .eq('user_id', userId)
    .eq('intervention_key', key)
    .maybeSingle();
  if (!data) return null;
  const resolved = resolveRows([data as unknown as UserInterventionRow]);
  return resolved[0] ?? null;
}

// ── Cambios de status (quirúrgicos — solo tocan la fila pedida) ──────────────

async function setStatus(
  userId: string,
  key: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase
    .from('user_interventions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('intervention_key', key);
  if (error) return false;
  emitChanged();
  return true;
}

/** Activa (SIN LÍMITE de activas — doctrina). Marca activated_at. */
export async function activateIntervention(userId: string, key: string): Promise<boolean> {
  return setStatus(userId, key, { status: 'active', activated_at: new Date().toISOString() });
}

/** Pausa (status 'paused'). Reactivable después sin perder ajustes. */
export async function deactivateIntervention(userId: string, key: string): Promise<boolean> {
  return setStatus(userId, key, { status: 'paused' });
}

/** Descarta: no vuelve a aparecer en sugeridas (el sync respeta 'dismissed'). */
export async function dismissIntervention(userId: string, key: string): Promise<boolean> {
  return setStatus(userId, key, { status: 'dismissed' });
}

// ── Ajustes del user ─────────────────────────────────────────────────────────

export interface InterventionAdjustments {
  custom_time?: string | null;
  custom_notes?: string | null;
  custom_dose?: string | null;
  priority?: 1 | 2 | 3;
}

/** Ajustes quirúrgicos (hora custom, notas, dosis, prioridad). */
export async function adjustIntervention(
  userId: string,
  key: string,
  adjustments: InterventionAdjustments,
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if ('custom_time' in adjustments) patch.custom_time = adjustments.custom_time;
  if ('custom_notes' in adjustments) patch.custom_notes = adjustments.custom_notes;
  if ('custom_dose' in adjustments) patch.custom_dose = adjustments.custom_dose;
  if (adjustments.priority != null) patch.priority = adjustments.priority;
  if (Object.keys(patch).length === 0) return true;
  return setStatus(userId, key, patch);
}

// ── Compleciones diarias + electrón ──────────────────────────────────────────

/**
 * Marca una intervención como completada en `date` (default hoy local, regla #3).
 * Upsert idempotente (UNIQUE user_intervention_id+date, migración 172) + electrón
 * vía awardBooleanElectron con idempotencyKey por intervención+día. El emit de
 * 'electrons_changed' va DESPUÉS del award (regla #5 CLAUDE.md).
 */
export async function logCompletion(
  userId: string,
  userInterventionId: string,
  date: string = getLocalToday(),
): Promise<boolean> {
  const { error } = await supabase
    .from('intervention_completions')
    .upsert(
      { user_intervention_id: userInterventionId, user_id: userId, date, completed: true },
      { onConflict: 'user_intervention_id,date' },
    );
  if (error) return false;

  await awardBooleanElectron(userId, 'intervention', {
    idempotencyKey: `${userId}:intervention:${userInterventionId}:${date}`,
  });
  DeviceEventEmitter.emit('electrons_changed');
  emitChanged();
  return true;
}

/** IDs de user_interventions completadas HOY (para checks en UI). */
export async function getTodayCompletions(userId: string): Promise<Set<string>> {
  const today = getLocalToday();
  const { data } = await supabase
    .from('intervention_completions')
    .select('user_intervention_id')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('completed', true);
  return new Set(((data ?? []) as { user_intervention_id: string }[]).map((r) => r.user_intervention_id));
}
