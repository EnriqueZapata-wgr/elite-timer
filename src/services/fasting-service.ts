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
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
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
  const { data, error } = await supabase
    .from('fasting_logs')
    .insert({
      user_id: params.userId,
      fast_start: (params.startTime ?? new Date()).toISOString(),
      target_hours: params.targetHours,
      status: 'active',
      date: getLocalToday(),
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
