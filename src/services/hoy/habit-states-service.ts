/**
 * habit-states-service (MB-26 Pieza 1) — la capa con efectos de los tres
 * estados del hábito. Tabla user_habit_states (migración 255).
 *
 * ⚠️ Clase {error}: supabase-js no lanza en 4xx — toda lectura se revisa.
 * Con la migración 255 pendiente en remoto, getHabitStates devuelve null y
 * TODO se comporta como hoy (todos activos): nadie pierde nada.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { HabitEstado, HabitEstadoRow } from '@/src/services/hoy/habit-states-core';

/** null = FALLO de lectura (o migración pendiente): tratar como sin filas. */
export async function getHabitStates(userId: string): Promise<HabitEstadoRow[] | null> {
  const { data, error } = await supabase
    .from('user_habit_states')
    .select('habit_key, state, graduated_at, paused_at')
    .eq('user_id', userId);
  if (error) {
    logWarn('[habit-states] read failed', error);
    return null;
  }
  return (data ?? []) as HabitEstadoRow[];
}

/**
 * Fija el estado de UN hábito. Graduar estampa graduated_at; reposar
 * estampa paused_at; volver a activo limpia ambos (el historial del hábito
 * vive en electron_logs/daily_electrons y no se toca jamás desde aquí).
 */
export async function setHabitState(
  userId: string,
  habitKey: string,
  state: HabitEstado,
): Promise<{ ok: boolean }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_habit_states').upsert(
    {
      user_id: userId,
      habit_key: habitKey,
      state,
      graduated_at: state === 'graduado' ? now : null,
      paused_at: state === 'reposo' ? now : null,
      updated_at: now,
    },
    { onConflict: 'user_id,habit_key' },
  );
  if (error) {
    logWarn('[habit-states] write failed', error);
    return { ok: false };
  }
  DeviceEventEmitter.emit('electrons_changed');
  return { ok: true };
}

/** Varios de un jalón (los caminos de Ordenar mi día). Reporta lo real. */
export async function setHabitStates(
  userId: string,
  cambios: { key: string; state: HabitEstado }[],
): Promise<{ ok: boolean; fallidos: string[] }> {
  if (cambios.length === 0) return { ok: true, fallidos: [] };
  const now = new Date().toISOString();
  const rows = cambios.map((c) => ({
    user_id: userId,
    habit_key: c.key,
    state: c.state,
    graduated_at: c.state === 'graduado' ? now : null,
    paused_at: c.state === 'reposo' ? now : null,
    updated_at: now,
  }));
  const { error } = await supabase
    .from('user_habit_states')
    .upsert(rows, { onConflict: 'user_id,habit_key' });
  if (error) {
    logWarn('[habit-states] batch write failed', error);
    return { ok: false, fallidos: cambios.map((c) => c.key) };
  }
  DeviceEventEmitter.emit('electrons_changed');
  return { ok: true, fallidos: [] };
}

/**
 * EL SEGURO CONTRA EL TOGGLE SILENCIOSO (hueco clase checkin,
 * day-booleans.ts:26-47): toda puerta que ENCIENDE hábitos debe llamar esto
 * con las llaves que enciende. Un hábito en reposo o graduado que el
 * usuario vuelve a encender regresa a activo; si no, su card jamás
 * reaparecería (el filtro de estados la seguiría quitando del compile).
 *
 * Solo toca filas que existen con estado distinto de activo: para el resto
 * es un no-op sin escrituras. Fail-soft: si la migración 255 no está, no
 * hay filas que tocar y el update es inocuo.
 */
export async function reactivarHabitos(userId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { error } = await supabase
    .from('user_habit_states')
    .update({ state: 'activo', graduated_at: null, paused_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('habit_key', keys)
    .neq('state', 'activo');
  if (error) logWarn('[habit-states] reactivar failed', error);
}
