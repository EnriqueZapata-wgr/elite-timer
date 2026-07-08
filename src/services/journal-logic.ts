/**
 * Journal — lógica pura (#39). Sin imports de supabase/RN para que sea
 * testeable en vitest node (el import de supabase arrastra react-native,
 * cuya sintaxis Flow rompe el parser).
 */
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';

/** YYYY-MM-DD de hace N días (local). */
export function dateNDaysAgo(days: number, today: string = getLocalToday()): string {
  const d = parseLocalDate(today);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Racha de días consecutivos escribiendo, terminando hoy o ayer (una racha
 * "viva" no se rompe si todavía no escribes hoy).
 */
export function computeJournalStreak(
  entryDates: string[],
  today: string = getLocalToday(),
): number {
  if (entryDates.length === 0) return 0;
  const unique = Array.from(new Set(entryDates)).sort().reverse(); // desc
  const yesterday = dateNDaysAgo(1, today);
  // La racha debe anclar en hoy o ayer
  let cursor: string;
  if (unique[0] === today) cursor = today;
  else if (unique[0] === yesterday) cursor = yesterday;
  else return 0;

  let streak = 0;
  for (const date of unique) {
    if (date === cursor) {
      streak++;
      cursor = dateNDaysAgo(1, cursor);
    } else if (date < cursor) {
      break; // hueco — se rompió la racha
    }
  }
  return streak;
}
