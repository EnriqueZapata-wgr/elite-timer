/**
 * Historia Clínica viva — servicio de síntomas por sistema funcional.
 *
 * F3 sprint UX blockers V1.3: expediente del usuario sobre las tablas
 * `clinical_symptoms` + `clinical_symptom_logs` (migración 152). El
 * agrupado y el resumen ejecutivo son funciones PURAS para poder
 * testearlas sin Supabase.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { type FunctionalSystemKey } from '@/src/constants/functional-systems';
import type { ClinicalSymptom, SymptomLog } from './clinical-history-core';

// Lógica pura (agrupado + resumen) vive en clinical-history-core.ts (testeable)
export {
  groupSymptomsBySystem,
  buildExecutiveSummary,
  type ClinicalSymptom,
  type SymptomLog,
  type SymptomsBySystem,
  type ExecutiveSummary,
} from './clinical-history-core';

/** Notificar a HOY/pantallas que el expediente cambió (regla transversal F3). */
function emitClinicalHistoryChanged() {
  DeviceEventEmitter.emit('clinical_history_changed');
}

// ═══ LECTURA ═══

export async function loadSymptoms(userId: string): Promise<ClinicalSymptom[]> {
  const { data, error } = await supabase
    .from('clinical_symptoms')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.warn('[clinical-history] loadSymptoms:', error.message);
    return [];
  }
  return (data ?? []) as ClinicalSymptom[];
}

export async function loadSymptomLogs(symptomId: string): Promise<SymptomLog[]> {
  const { data, error } = await supabase
    .from('clinical_symptom_logs')
    .select('id, symptom_id, severity, note, logged_at')
    .eq('symptom_id', symptomId)
    .order('logged_at', { ascending: false });
  if (error) {
    console.warn('[clinical-history] loadSymptomLogs:', error.message);
    return [];
  }
  return (data ?? []) as SymptomLog[];
}

// ═══ ESCRITURA ═══

export async function addSymptom(
  userId: string,
  systemKey: FunctionalSystemKey,
  name: string,
  severity: number,
  notes?: string,
): Promise<ClinicalSymptom | null> {
  const { data, error } = await supabase
    .from('clinical_symptoms')
    .insert({
      user_id: userId,
      system_key: systemKey,
      name: name.trim(),
      severity,
      notes: notes?.trim() || null,
      first_seen: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  if (error) {
    console.warn('[clinical-history] addSymptom:', error.message);
    return null;
  }
  const symptom = data as ClinicalSymptom;
  // Primer punto del timeline
  await supabase.from('clinical_symptom_logs').insert({
    symptom_id: symptom.id,
    user_id: userId,
    severity,
    note: notes?.trim() || null,
  });
  emitClinicalHistoryChanged();
  return symptom;
}

/** Registra un nuevo punto de severidad (timeline) y actualiza el síntoma. */
export async function logSeverity(
  userId: string,
  symptomId: string,
  severity: number,
  note?: string,
): Promise<boolean> {
  const { error: logError } = await supabase.from('clinical_symptom_logs').insert({
    symptom_id: symptomId,
    user_id: userId,
    severity,
    note: note?.trim() || null,
  });
  if (logError) {
    console.warn('[clinical-history] logSeverity:', logError.message);
    return false;
  }
  const { error } = await supabase
    .from('clinical_symptoms')
    .update({ severity, updated_at: new Date().toISOString() })
    .eq('id', symptomId);
  if (error) console.warn('[clinical-history] logSeverity update:', error.message);
  emitClinicalHistoryChanged();
  return true;
}

/** Marcar síntoma como resuelto (o reabrirlo). */
export async function setSymptomResolved(symptomId: string, resolved: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('clinical_symptoms')
    .update({
      status: resolved ? 'resolved' : 'active',
      resolved_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', symptomId);
  if (error) {
    console.warn('[clinical-history] setSymptomResolved:', error.message);
    return false;
  }
  emitClinicalHistoryChanged();
  return true;
}

