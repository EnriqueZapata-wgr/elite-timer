/**
 * Supplements service — conteo de suplementos del protocolo para la card SUPLEMENTOS del HOY (#v13f 2.4).
 *
 * Fuente de verdad (misma que la lista tabular legacy del HOY):
 *   - `user_supplements` (is_active = true) → total de suplementos del protocolo (Y).
 *   - `supplement_logs` (date = hoy, taken = true) → cuántos tomados hoy (X).
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supplementsTodayProgress } from './supplements-adherence-core';
import { resolvePregnancyActive } from './pregnancy-gate-core';

export interface SupplementsToday {
  /** Total de TOMAS del día (multi-dosis 188: N tomas = N checks). */
  total: number;
  /** Cuántas de esas tomas se marcaron hoy. */
  taken: number;
}

/** Tomas del día y cuántas registró hoy (para el subtitle "X / Y tomados"). */
export async function getSupplementsTodayCount(userId: string): Promise<SupplementsToday> {
  try {
    const today = getLocalToday();
    const [suppsRes, logsRes] = await Promise.all([
      supabase.from('user_supplements').select('id, dose_times').eq('user_id', userId).eq('is_active', true),
      supabase.from('supplement_logs').select('supplement_id, dose_index, taken').eq('user_id', userId).eq('date', today),
    ]);
    return supplementsTodayProgress(
      (suppsRes.data ?? []) as { id: string; dose_times?: string[] | null }[],
      (logsRes.data ?? []) as { supplement_id: string; dose_index?: number | null; taken: boolean }[],
    );
  } catch {
    return { total: 0, taken: 0 };
  }
}

/**
 * Máscara EMBARAZO (Sprint SUPS+BHA 4.1.4) — el dato REAL existe en dos fuentes
 * (investigado):
 *  · cycle_settings.pregnancy_status JSONB { is_pregnant: true, ... } (migración 080)
 *  · client_profiles.cycle_modality = 'pregnancy' (onboarding v2, task #111)
 * Cualquiera activa la máscara. Fail-soft: sin dato / error → false.
 */
export async function isPregnancyActive(userId: string): Promise<boolean> {
  try {
    const [cycleRes, profileRes] = await Promise.all([
      supabase.from('cycle_settings').select('pregnancy_status').eq('user_id', userId).maybeSingle(),
      supabase.from('client_profiles').select('cycle_modality, biological_sex').eq('user_id', userId).maybeSingle(),
    ]);
    // Gate por sexo biológico dentro del core puro: la máscara embarazo/lactancia solo
    // aplica a usuarias femeninas; un dato residual NUNCA la activa para male/null (#4).
    return resolvePregnancyActive({
      biologicalSex: (profileRes.data as any)?.biological_sex,
      pregnancyStatus: (cycleRes.data as any)?.pregnancy_status,
      cycleModality: (profileRes.data as any)?.cycle_modality,
    });
  } catch {
    return false;
  }
}
