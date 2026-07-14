/**
 * Client Profile Service — Perfil extendido, condiciones, mediciones, labs.
 */
import { supabase } from '@/src/lib/supabase';
import type { FlagStatus } from '@/src/data/condition-catalog';
import { NEXT_STATUS } from '@/src/data/condition-catalog';
import { getLocalToday } from '@/src/utils/date-helpers';

// === AUTH ===
async function getAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===
export interface ConditionFlag {
  condition_key: string;
  zone: string;
  status: FlagStatus;
  notes: string | null;
  diagnosed_date: string | null;
  lab_value: string | null;
  medication: string | null;
}

// === CONDITION FLAGS ===

export async function getConditionFlags(userId: string): Promise<ConditionFlag[]> {
  const { data, error } = await supabase
    .from('condition_flags')
    .select('condition_key, zone, status, notes, diagnosed_date, lab_value, medication')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as ConditionFlag[];
}

export async function toggleConditionFlag(userId: string, conditionKey: string, zone: string): Promise<FlagStatus> {
  const user = await getAuth();

  // Obtener estado actual
  const { data: existing } = await supabase
    .from('condition_flags')
    .select('status')
    .eq('user_id', userId)
    .eq('condition_key', conditionKey)
    .single();

  const currentStatus: FlagStatus = (existing?.status as FlagStatus) ?? 'not_evaluated';
  const nextStatus = NEXT_STATUS[currentStatus];

  if (!existing) {
    // Crear nuevo
    const { error } = await supabase.from('condition_flags').insert({
      user_id: userId,
      condition_key: conditionKey,
      zone,
      status: nextStatus,
      updated_by: user.id,
    });
    if (error) throw error;
  } else {
    // Actualizar
    const { error } = await supabase
      .from('condition_flags')
      .update({ status: nextStatus, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('user_id', userId)
      .eq('condition_key', conditionKey);
    if (error) throw error;
  }

  return nextStatus;
}

// === CLIENT PROFILE ===

export async function getClientProfile(userId: string) {
  const { data } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function upsertClientProfile(userId: string, profileData: Record<string, any>) {
  const { error } = await supabase
    .from('client_profiles')
    .upsert({ user_id: userId, ...profileData, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

// === BODY MEASUREMENTS ===

export async function getLatestMeasurements(userId: string) {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getMeasurementHistory(userId: string, limit = 5) {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function addMeasurement(userId: string, data: Record<string, any>) {
  const user = await getAuth();
  const { error } = await supabase.from('body_measurements').insert({
    user_id: userId, measured_by: user.id, ...data,
  });
  if (error) throw error;
}

// === MEDICATIONS ===

export async function getMedications(userId: string) {
  const { data } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('name');
  return data ?? [];
}

export async function addMedication(userId: string, med: Record<string, any>) {
  const { error } = await supabase.from('medications').insert({ user_id: userId, ...med });
  if (error) throw error;
}

export async function toggleMedication(medId: string, currentlyActive: boolean) {
  const { error } = await supabase
    .from('medications')
    .update({
      is_active: !currentlyActive,
      ...(currentlyActive ? { ended_date: getLocalToday() } : { ended_date: null }),
    })
    .eq('id', medId);
  if (error) throw error;
}

// === SUPPLEMENTS ===
// 194: fuente única user_supplements (supplement_protocols legacy consolidada).
// El mapeo dose/frequency ↔ dosage/dose_pattern vive AQUÍ para no tocar
// ClientDetailScreen (renderiza s.dose / s.frequency / s.brand).

export async function getSupplements(userId: string) {
  const { data } = await supabase
    .from('user_supplements')
    .select('*')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('name');
  return (data ?? []).map((r: any) => ({ ...r, dose: r.dosage, frequency: r.dose_pattern }));
}

export async function addSupplement(userId: string, supp: Record<string, any>) {
  const { error } = await supabase.from('user_supplements').insert({
    user_id: userId,
    name: supp.name,
    dosage: String(supp.dose ?? '').trim() || '—',
    dose_pattern: String(supp.frequency ?? '').trim() || null,
    brand: supp.brand || null,
    reason: supp.reason || null,
    source: 'coach',
  });
  if (error) throw error;
}

export async function toggleSupplement(suppId: string, currentlyActive: boolean) {
  const { error } = await supabase
    .from('user_supplements')
    .update({ is_active: !currentlyActive })
    .eq('id', suppId);
  if (error) throw error;
}

// === LABS ===

export async function getLatestLabs(userId: string) {
  const { data } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('lab_date', { ascending: false })
    .limit(1)
    .single();
  return data;
}

// === FAMILY HISTORY ===

export async function getFamilyHistory(userId: string) {
  const { data } = await supabase
    .from('family_history')
    .select('*')
    .eq('user_id', userId)
    .order('relation', { ascending: true });
  return data ?? [];
}

export async function addFamilyHistory(userId: string, entry: { relation: string; condition: string; notes?: string }) {
  const { error } = await supabase.from('family_history').insert({ user_id: userId, ...entry });
  if (error) throw error;
}

export async function deleteFamilyHistory(id: string) {
  const { error } = await supabase.from('family_history').delete().eq('id', id);
  if (error) throw error;
}
