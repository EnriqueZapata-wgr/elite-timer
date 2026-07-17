/**
 * user-symptoms-service — I/O del modelo unificado de síntomas (B3).
 * Escribe/lee la tabla canónica `user_symptoms` (migración 202). Defensivo:
 * toda lectura cae a [] si falla; nunca rompe la pantalla.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/services/routine-service';
import { warn as logWarn } from '@/src/lib/logger';
import type { UserSymptom, NewSymptomInput } from './user-symptoms-core';

export const SYMPTOMS_CHANGED_EVENT = 'user_symptoms_changed';

/** Todos los síntomas del user (activos + resueltos), recientes primero. */
export async function loadUserSymptoms(userId: string): Promise<UserSymptom[]> {
  try {
    const { data } = await supabase
      .from('user_symptoms')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('started_at', { ascending: false });
    return (data ?? []) as UserSymptom[];
  } catch (e) {
    logWarn('[user-symptoms] load failed', e);
    return [];
  }
}

/** Crea un síntoma. Devuelve la fila creada o null. Emite el evento de cambio. */
export async function addUserSymptom(userId: string, input: NewSymptomInput): Promise<UserSymptom | null> {
  try {
    const row = {
      id: generateUUID(),
      user_id: userId,
      name: input.name.trim(),
      severity: input.severity,
      system_key: input.system_key ?? null,
      started_at: input.started_at ?? new Date().toISOString(),
      resolved_at: null,
      is_active: true,
      note: input.note?.trim() || null,
      // sin sistema → 'aislado' (mantiene la semántica de peso del DX).
      source_kind: input.system_key ? 'sistema' : 'aislado',
    };
    const { data, error } = await supabase.from('user_symptoms').insert(row).select().single();
    if (error) { logWarn('[user-symptoms] add failed', error); return null; }
    DeviceEventEmitter.emit(SYMPTOMS_CHANGED_EVENT);
    return data as UserSymptom;
  } catch (e) {
    logWarn('[user-symptoms] add threw', e);
    return null;
  }
}

/** Marca resuelto (o reactiva). Setea resolved_at → dispara la duración. */
export async function setSymptomResolved(userId: string, id: string, resolved: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_symptoms').update({
      is_active: !resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('user_id', userId);
    if (error) { logWarn('[user-symptoms] resolve failed', error); return false; }
    DeviceEventEmitter.emit(SYMPTOMS_CHANGED_EVENT);
    return true;
  } catch (e) {
    logWarn('[user-symptoms] resolve threw', e);
    return false;
  }
}

/** Actualiza la severidad de un síntoma activo. */
export async function updateSymptomSeverity(userId: string, id: string, severity: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_symptoms')
      .update({ severity, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId);
    if (error) { logWarn('[user-symptoms] severity failed', error); return false; }
    DeviceEventEmitter.emit(SYMPTOMS_CHANGED_EVENT);
    return true;
  } catch (e) {
    logWarn('[user-symptoms] severity threw', e);
    return false;
  }
}

/** Borra un síntoma. */
export async function deleteUserSymptom(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_symptoms').delete().eq('id', id).eq('user_id', userId);
    if (error) { logWarn('[user-symptoms] delete failed', error); return false; }
    DeviceEventEmitter.emit(SYMPTOMS_CHANGED_EVENT);
    return true;
  } catch (e) {
    logWarn('[user-symptoms] delete threw', e);
    return false;
  }
}
