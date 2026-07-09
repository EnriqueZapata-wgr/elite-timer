/**
 * Onboarding v2 — servicio I/O (F2 sprint UX blockers V1.3).
 *
 * Reemplaza a onboarding-service.ts (motor v1, 9 bloques — eliminado).
 * La lógica pura (steps, rutas, cronotipo, modalidades) vive en
 * onboarding-v2-core.ts. Aquí: persistencia en Supabase + emisión de eventos.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import {
  type V2Step,
  type CycleModality,
  type Chronotype,
  nextV2Step,
  v2Route,
  CHRONO_SCHEDULES,
} from './onboarding-v2-core';

/**
 * Marca el step como completado: persiste el SIGUIENTE step pendiente en
 * profiles.onboarding_step ('v2_<next>') o 'completed' al terminar.
 * Devuelve la ruta a la que navegar.
 */
export async function completeV2Step(userId: string, step: V2Step): Promise<string> {
  const next = nextV2Step(step);
  if (next) {
    await supabase.from('profiles').update({ onboarding_step: `v2_${next}` }).eq('id', userId);
    DeviceEventEmitter.emit('onboarding_step_changed');
    return v2Route(next);
  }
  await supabase.from('profiles').update({
    onboarding_step: 'completed',
    onboarding_completed_at: new Date().toISOString(),
  }).eq('id', userId);
  DeviceEventEmitter.emit('onboarding_step_changed');
  // MAGIA ARGOS T6: primer contacto cinemático con ARGOS antes de HOY. La
  // pantalla marca argos_introduced_at y luego enruta a /(tabs).
  return '/argos/meet';
}

/** Guarda la modalidad de ciclo (task #111) en client_profiles. */
export async function saveCycleModality(userId: string, modality: CycleModality): Promise<boolean> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ cycle_modality: modality })
    .eq('user_id', userId);
  if (error) {
    console.warn('[onboarding-v2] saveCycleModality:', error.message);
    return false;
  }
  return true;
}

/** Lee la modalidad de ciclo actual (para Settings). */
export async function loadCycleModality(userId: string): Promise<CycleModality | null> {
  const { data } = await supabase
    .from('client_profiles')
    .select('cycle_modality')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.cycle_modality as CycleModality) ?? null;
}

/** Registra el consentimiento médico (pantalla consent). */
export async function saveMedicalConsent(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ medical_consent_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.warn('[onboarding-v2] saveMedicalConsent:', error.message);
    return false;
  }
  return true;
}

/** Guarda cronotipo + horarios recomendados en user_chronotype (mismo shape que v1). */
export async function saveChronotype(userId: string, chrono: Chronotype): Promise<boolean> {
  const schedule = CHRONO_SCHEDULES[chrono];
  const { error } = await supabase.from('user_chronotype').upsert({
    user_id: userId,
    chronotype: chrono,
    wake_time: schedule.wake,
    sleep_time: schedule.sleep,
    peak_physical: schedule.peak_physical,
    peak_focus_start: schedule.peak_focus_start,
    peak_focus_end: schedule.peak_focus_end,
    wind_down: schedule.wind_down,
  });
  if (error) {
    console.warn('[onboarding-v2] saveChronotype:', error.message);
    return false;
  }
  return true;
}

// ═══ Progreso intra-cuestionario (patrón F01.17, heredado de v1) ═══
// Lo usa voice-config.tsx (standalone/backfill). Vive en
// client_profiles.onboarding_answers._progress.

export interface BlockProgress {
  answers: Record<string, any>;
  currentQ: number;
  [extra: string]: any;
}

export async function saveBlockProgress(
  userId: string,
  blockKey: string,
  data: Record<string, any>,
): Promise<void> {
  const { data: row } = await supabase
    .from('client_profiles')
    .select('onboarding_answers')
    .eq('user_id', userId)
    .maybeSingle();
  const oa = (row?.onboarding_answers as Record<string, any>) ?? {};
  oa._progress = { block: blockKey, ...data };
  await supabase.from('client_profiles').update({ onboarding_answers: oa }).eq('user_id', userId);
}

export async function loadBlockProgress(
  userId: string,
  blockKey: string,
): Promise<BlockProgress | null> {
  const { data } = await supabase
    .from('client_profiles')
    .select('onboarding_answers')
    .eq('user_id', userId)
    .maybeSingle();
  const oa = (data?.onboarding_answers as Record<string, any>) ?? {};

  const prog = oa._progress;
  if (prog && prog.block === blockKey && prog.answers) {
    const { block: _block, ...rest } = prog;
    return { currentQ: 0, ...rest } as BlockProgress;
  }

  const finalAnswers = oa[blockKey];
  if (finalAnswers && typeof finalAnswers === 'object') {
    return { answers: finalAnswers, currentQ: 0 };
  }

  return null;
}

export async function clearBlockProgress(userId: string): Promise<void> {
  const { data: row } = await supabase
    .from('client_profiles')
    .select('onboarding_answers')
    .eq('user_id', userId)
    .maybeSingle();
  const oa = (row?.onboarding_answers as Record<string, any>) ?? {};
  if (oa._progress) {
    delete oa._progress;
    await supabase.from('client_profiles').update({ onboarding_answers: oa }).eq('user_id', userId);
  }
}
