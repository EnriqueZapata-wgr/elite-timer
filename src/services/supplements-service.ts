/**
 * Supplements service — conteo de suplementos del protocolo para la card SUPLEMENTOS del HOY (#v13f 2.4).
 *
 * Fuente de verdad (misma que la lista tabular legacy del HOY):
 *   - `user_supplements` (is_active = true) → total de suplementos del protocolo (Y).
 *   - `supplement_logs` (date = hoy, taken = true) → cuántos tomados hoy (X).
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';

export interface SupplementsToday {
  /** Total de suplementos activos del protocolo del usuario. */
  total: number;
  /** Cuántos de esos activos se marcaron como tomados hoy. */
  taken: number;
}

/** Total de suplementos activos y cuántos tomó hoy (para el subtitle "X / Y tomados"). */
export async function getSupplementsTodayCount(userId: string): Promise<SupplementsToday> {
  try {
    const today = getLocalToday();
    const [suppsRes, logsRes] = await Promise.all([
      supabase.from('user_supplements').select('id').eq('user_id', userId).eq('is_active', true),
      supabase.from('supplement_logs').select('supplement_id, taken').eq('user_id', userId).eq('date', today),
    ]);
    const activeIds = new Set((suppsRes.data ?? []).map((s: any) => s.id));
    const taken = (logsRes.data ?? []).filter((l: any) => l.taken && activeIds.has(l.supplement_id)).length;
    return { total: activeIds.size, taken };
  } catch {
    return { total: 0, taken: 0 };
  }
}
