/**
 * Adherencia de suplementos — I/O (#54, Sprint NUTRICIÓN T4).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { weeklyAdherencePct } from './supplements-adherence-core';

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
      supabase.from('user_supplements')
        .select('id, dose_pattern')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase.from('supplement_logs')
        .select('supplement_id, date, taken')
        .eq('user_id', userId)
        .gte('date', weekAgo),
    ]);

    const supps = (suppsRes.data ?? []) as { id: string; dose_pattern: string | null }[];
    const logs = (logsRes.data ?? []) as { supplement_id: string; taken: boolean }[];

    return weeklyAdherencePct(
      supps.map((s) => ({
        dosePattern: s.dose_pattern,
        takenDays: logs.filter((l) => l.supplement_id === s.id && l.taken).length,
      })),
    );
  } catch (e) {
    logWarn('[supplements] weekly adherence failed:', e);
    return null;
  }
}
