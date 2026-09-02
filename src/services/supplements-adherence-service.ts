/**
 * Adherencia de suplementos — I/O (#54, Sprint NUTRICIÓN T4).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { weeklyAdherencePct, takenDosesBySupplement, doseCountFor } from './supplements-adherence-core';
import { esPlan } from './supplements/adherencia-core';

/**
 * Adherencia de los últimos 7 días contra el dose_pattern de cada
 * suplemento activo. null si el usuario no tiene suplementos.
 */
export async function getWeeklyAdherence(userId: string): Promise<number | null> {
  try {
    const cursor = parseLocalDate(getLocalToday());
    cursor.setDate(cursor.getDate() - 6);
    const weekAgo = toLocalDateString(cursor);

    const [suppsRes, logsRes] = await Promise.all([
      // 312 (10.4): solo el plan mide adherencia. select('*'): ver supplements-service.
      supabase.from('user_supplements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase.from('supplement_logs')
        .select('supplement_id, date, taken, dose_index')
        .eq('user_id', userId)
        .gte('date', weekAgo),
    ]);

    const supps = ((suppsRes.data ?? []) as { id: string; dose_pattern: string | null; dose_times: string[] | null; is_plan?: boolean | null }[])
      .filter(esPlan);
    const logs = (logsRes.data ?? []) as { supplement_id: string; date: string; dose_index?: number | null; taken: boolean }[];

    // MB-2: adherencia por TOMA — Σ tomas tomadas / Σ tomas esperadas,
    // consistente con supplementsTodayProgress.
    const doseCounts = Object.fromEntries(supps.map((s) => [s.id, doseCountFor(s.dose_times)]));
    const takenDoses = takenDosesBySupplement(logs, doseCounts);
    return weeklyAdherencePct(
      supps.map((s) => ({
        dosePattern: s.dose_pattern,
        doseCount: doseCounts[s.id],
        takenDoses: takenDoses[s.id] ?? 0,
      })),
    );
  } catch (e) {
    logWarn('[supplements] weekly adherence failed:', e);
    return null;
  }
}
