/**
 * Fasting Service — Step AYUNO REWRITE.
 * Centraliza TODAS las operaciones de DB sobre `fasting_logs`. Cada mutación
 * usa `.select()` y verifica que afectó filas: un UPDATE/DELETE que devuelve
 * `error: null` pero 0 filas (RLS denial, row-not-found, 200-but-0-rows) NO se
 * trata como éxito — devuelve `{ ok: false, reason: 'no_rows' }`. Esto evita el
 * bug "Paty atrapada 90h": limpiar el estado local creyendo que se cerró el
 * ayuno cuando la fila sigue 'active' en DB.
 */
import { supabase } from '@/src/lib/supabase';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { warn as logWarn } from '@/src/lib/logger';

export type FastStatus = 'active' | 'completed' | 'cancelled';

export interface FastingLog {
  id: string;
  user_id: string;
  date: string;
  fast_start: string | null;
  fast_end: string | null;
  target_hours: number | null;
  actual_hours: number | null;
  broke_fast_with: string | null;
  energy_during: number | null;
  status: FastStatus;
  notes: string | null;
  created_at: string;
}

export type MutationReason = 'rls' | 'no_rows' | 'network' | 'constraint' | 'unknown';

export type MutationResult<T = FastingLog> =
  | { ok: true; data: T }
  | { ok: false; reason: MutationReason; message: string };

/** Mapea un error de Supabase a un MutationReason + loggea. */
function classifyError(op: string, error: { code?: string; message: string }): {
  reason: MutationReason;
  message: string;
} {
  if (error.code === '23505') return { reason: 'constraint', message: error.message }; // unique_violation
  if (error.code === '23514') return { reason: 'constraint', message: error.message }; // check_violation
  logWarn(`[fasting-service] ${op} error:`, error);
  return { reason: 'unknown', message: error.message };
}

// === READ ===

export async function getActiveFast(userId: string): Promise<FastingLog | null> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('fast_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logWarn('[fasting-service] getActiveFast error:', error);
    return null;
  }
  return (data as FastingLog) ?? null;
}

export async function loadHistory(userId: string, limit = 20): Promise<FastingLog[]> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('fast_start', { ascending: false })
    .limit(limit);
  if (error) {
    logWarn('[fasting-service] loadHistory error:', error);
    return [];
  }
  return (data as FastingLog[]) ?? [];
}

/** Rango por fecha (consumido por el panel de coach). Migrado desde nutrition-service. */
export async function getFastingLogsRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<FastingLog[]> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  if (error) {
    logWarn('[fasting-service] getFastingLogsRange error:', error);
    return [];
  }
  return (data as FastingLog[]) ?? [];
}

// === MUTATIONS (todas verifican filas) ===

export async function startFast(params: {
  userId: string;
  targetHours: number;
  startTime?: Date;
}): Promise<MutationResult> {
  // Un solo golpe de reloj: fast_start y date deben salir del MISMO instante,
  // o un inicio a las 23:59:59.9 puede caer en días distintos.
  const inicio = params.startTime ?? new Date();
  const { data, error } = await supabase
    .from('fasting_logs')
    .insert({
      user_id: params.userId,
      fast_start: inicio.toISOString(),
      target_hours: params.targetHours,
      status: 'active',
      // AY-G2: «date» es la llave del calendario de adherencia, los reportes y
      // la tira semanal. Escribía la fecha de hoy, así que un ayuno abierto con
      // «¿Empezaste antes?» a las 23:00 de ayer se archivaba en HOY: un día se
      // pintaba cumplido y el vecino vacío. Ahora sale del inicio real.
      date: toLocalDateString(inicio),
    })
    .select();
  if (error) {
    const c = classifyError('startFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Insert no devolvió fila (RLS?)' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

export async function breakFast(params: {
  fastId: string;
  endTime: Date;
  actualHours: number;
  brokeFastWith?: string;
  energyDuring?: number;
}): Promise<MutationResult> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .update({
      actual_hours: Math.round(params.actualHours * 10) / 10,
      fast_end: params.endTime.toISOString(),
      status: 'completed',
      ...(params.brokeFastWith !== undefined ? { broke_fast_with: params.brokeFastWith } : {}),
      ...(params.energyDuring !== undefined ? { energy_during: params.energyDuring } : {}),
    })
    .eq('id', params.fastId)
    .select();
  if (error) {
    const c = classifyError('breakFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

export async function cancelActiveFast(fastId: string): Promise<MutationResult> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .update({ status: 'cancelled' })
    .eq('id', fastId)
    .select();
  if (error) {
    const c = classifyError('cancelActiveFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

export async function savePastFast(params: {
  userId: string;
  start: Date;
  end: Date;
  targetHours: number;
  actualHours: number;
  brokeFastWith?: string;
  energyDuring?: number;
}): Promise<MutationResult> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .insert({
      user_id: params.userId,
      fast_start: params.start.toISOString(),
      fast_end: params.end.toISOString(),
      actual_hours: Math.round(params.actualHours * 10) / 10,
      target_hours: params.targetHours,
      status: 'completed',
      date: toLocalDateString(params.start),
      ...(params.brokeFastWith !== undefined ? { broke_fast_with: params.brokeFastWith } : {}),
      ...(params.energyDuring !== undefined ? { energy_during: params.energyDuring } : {}),
    })
    .select();
  if (error) {
    const c = classifyError('savePastFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Insert no devolvió fila (RLS?)' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

export async function deleteFast(fastId: string): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .delete()
    .eq('id', fastId)
    .select('id');
  if (error) {
    const c = classifyError('deleteFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as { id: string } };
}

/**
 * Edita un ayuno existente (corregir hora de inicio/fin). Si se pasan ambos
 * start y end, recalcula actual_hours. Verifica filas como el resto.
 */
export async function updateFast(params: {
  fastId: string;
  fastStart?: Date;
  fastEnd?: Date | null;
  /** MB-8 Track F.2: editar la meta desde el propio timer. */
  targetHours?: number;
}): Promise<MutationResult> {
  const updates: Record<string, any> = {};
  if (params.targetHours !== undefined) updates.target_hours = params.targetHours;
  if (params.fastStart) {
    updates.fast_start = params.fastStart.toISOString();
    // AY-G2: mover el inicio mueve el día al que pertenece el ayuno. Antes se
    // corregía fast_start y «date» se quedaba con el valor viejo para siempre.
    updates.date = toLocalDateString(params.fastStart);
  }
  if (params.fastEnd !== undefined) {
    updates.fast_end = params.fastEnd ? params.fastEnd.toISOString() : null;
    if (params.fastStart && params.fastEnd) {
      // Recalcular actual_hours (redondeado a 1 decimal, como el resto del servicio).
      updates.actual_hours =
        Math.round(((params.fastEnd.getTime() - params.fastStart.getTime()) / 3_600_000) * 10) / 10;
    }
  }

  const { data, error } = await supabase
    .from('fasting_logs')
    .update(updates)
    .eq('id', params.fastId)
    .select();
  if (error) {
    const c = classifyError('updateFast', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

/**
 * Registra con qué se rompió el ayuno (doctrina ATP: proteína primero,
 * MB-8 Track D.2). Mismo contrato verificado que el resto del servicio.
 */
export async function recordBrokeFastWith(fastId: string, brokeFastWith: string): Promise<MutationResult> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .update({ broke_fast_with: brokeFastWith })
    .eq('id', fastId)
    .select();
  if (error) {
    const c = classifyError('recordBrokeFastWith', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

export async function autoCloseAtLimit(params: {
  fastId: string;
  hours: number;
  fastEnd: Date;
}): Promise<MutationResult> {
  const { data, error } = await supabase
    .from('fasting_logs')
    .update({
      status: 'completed',
      actual_hours: params.hours,
      fast_end: params.fastEnd.toISOString(),
    })
    .eq('id', params.fastId)
    .select();
  if (error) {
    const c = classifyError('autoCloseAtLimit', error);
    return { ok: false, ...c };
  }
  if (!data || data.length === 0) {
    return { ok: false, reason: 'no_rows', message: 'Row not found or RLS blocked' };
  }
  return { ok: true, data: data[0] as FastingLog };
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta de ayuno (MB-22 Pieza 3) — misma llave que escribe el picker de
// app/fasting.tsx: user_day_preferences.goals.fasting_hours. La ficha de
// Ayuno del Centro edita ESTA meta; el ayuno activo no se toca desde ahí
// (su target se cambia en el timer, que corre el gate de seguridad).
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_FASTING_GOAL_HOURS = 16;

export async function getFastingGoalHours(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('user_day_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();
    const hours = (data?.goals as any)?.fasting_hours;
    if (typeof hours === 'number' && hours > 0) return hours;
    return DEFAULT_FASTING_GOAL_HOURS;
  } catch {
    return DEFAULT_FASTING_GOAL_HOURS;
  }
}

export async function setFastingGoalHours(userId: string, hours: number): Promise<boolean> {
  try {
    const { data, error: readErr } = await supabase
      .from('user_day_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();
    if (readErr) logWarn('[fasting-service] goals read failed:', readErr.message);
    const goals = { ...((data?.goals as any) ?? {}), fasting_hours: hours };
    const { error } = await supabase
      .from('user_day_preferences')
      .upsert({ user_id: userId, goals }, { onConflict: 'user_id' });
    if (error) {
      logWarn('[fasting-service] goal upsert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    logWarn('[fasting-service] setFastingGoalHours failed:', e);
    return false;
  }
}
