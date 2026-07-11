/**
 * sintomas-service — I/O de síntomas aislados quick-tap (SALUD F5).
 *
 * Tabla: clinical_symptoms_aislados (migración 174, RLS dueño full + coach
 * lectura). Peso BAJO en el DX: el harvest de dx-engine.ts ya lee
 * tag/severity/logged_at de esta tabla — registrar aquí sube la calidad del
 * DX sin tocar el harvest. CERO fuga clínica: nada de esto toca comunidad.
 *
 * La lógica pura (validación + agrupación por día) vive en sintomas-core.ts.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import type { SintomaAisladoRow, SintomaInput } from './sintomas-core';

export const SINTOMAS_CHANGED_EVENT = 'sintomas_aislados_changed';

function emitChanged() {
  DeviceEventEmitter.emit(SINTOMAS_CHANGED_EVENT);
}

// ═══ LECTURA ═══

/** Timeline del user (más reciente primero). */
export async function loadSintomas(userId: string, limit = 120): Promise<SintomaAisladoRow[]> {
  const { data, error } = await supabase
    .from('clinical_symptoms_aislados')
    .select('id, user_id, tag, severity, note, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[sintomas] loadSintomas:', error.message);
    return [];
  }
  return (data ?? []) as SintomaAisladoRow[];
}

// ═══ ESCRITURA ═══

/**
 * Registra un síntoma aislado (input YA validado por validateSintomaInput).
 * logged_at lo pone Postgres (DEFAULT NOW()) — el registro es "ahora".
 */
export async function addSintoma(
  userId: string,
  input: SintomaInput,
): Promise<SintomaAisladoRow | null> {
  const { data, error } = await supabase
    .from('clinical_symptoms_aislados')
    .insert({
      user_id: userId,
      tag: input.tag,
      severity: input.severity,
      note: input.note,
    })
    .select('id, user_id, tag, severity, note, logged_at')
    .single();
  if (error) {
    console.warn('[sintomas] addSintoma:', error.message);
    return null;
  }
  emitChanged();
  return data as SintomaAisladoRow;
}

/** Borra un registro del timeline (corrección de errores del user). */
export async function deleteSintoma(userId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('clinical_symptoms_aislados')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    console.warn('[sintomas] deleteSintoma:', error.message);
    return false;
  }
  emitChanged();
  return true;
}
