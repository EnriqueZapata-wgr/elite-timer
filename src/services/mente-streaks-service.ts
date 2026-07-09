/**
 * MENTE streaks + medallas — I/O (T5 Sprint MENTE Ecosystem).
 *
 * Rachas por categoría desde sus fuentes (journal_entries.date,
 * mind_sessions.date por tipo, emotional_checkins.created_at→fecha local)
 * + sincronización de medallas en mente_medals (migración 165).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { computeJournalStreak } from './journal-logic';
import { toLocalDateString } from '@/src/utils/date-helpers';
import {
  MENTE_CATEGORIES,
  medalsToAward,
  type MedalTier,
  type MenteCategory,
} from './mente-streaks-core';

export type MenteStreaks = Record<MenteCategory, number>;

export interface MenteMedal {
  category: MenteCategory;
  tier: MedalTier;
  awarded_at: string;
}

const LOOKBACK_ROWS = 400;

/** Rachas vivas (ancla hoy/ayer) de las 4 categorías del pilar. */
export async function fetchMenteStreaks(userId: string): Promise<MenteStreaks> {
  const [journal, sessions, checkins] = await Promise.all([
    supabase.from('journal_entries')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(LOOKBACK_ROWS)
      .then(({ data }) => (data ?? []).map((r: any) => String(r.date).slice(0, 10))),
    supabase.from('mind_sessions')
      .select('type, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(LOOKBACK_ROWS)
      .then(({ data }) => data ?? []),
    supabase.from('emotional_checkins')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(LOOKBACK_ROWS)
      .then(({ data }) => (data ?? []).map((r: any) => toLocalDateString(new Date(r.created_at)))),
  ]);

  const sessionDates = (type: string) =>
    sessions.filter((s: any) => s.type === type).map((s: any) => String(s.date).slice(0, 10));

  return {
    journal: computeJournalStreak(journal),
    breathing: computeJournalStreak(sessionDates('breathing')),
    meditation: computeJournalStreak(sessionDates('meditation')),
    checkin: computeJournalStreak(checkins),
  };
}

/** Medallas ya persistidas del usuario. */
export async function fetchMenteMedals(userId: string): Promise<MenteMedal[]> {
  const { data, error } = await supabase
    .from('mente_medals')
    .select('category, tier, awarded_at')
    .eq('user_id', userId);
  if (error) {
    logWarn('[mente] fetchMenteMedals:', error.message);
    return [];
  }
  return (data ?? []) as MenteMedal[];
}

/**
 * Sincroniza medallas: inserta las que la racha actual justifica y aún no
 * existen. Devuelve las RECIÉN otorgadas (para celebrarlas en UI).
 * Idempotente: UNIQUE (user_id, category, tier) + upsert ignoreDuplicates.
 */
export async function syncMenteMedals(
  userId: string,
  streaks: MenteStreaks,
  existing: MenteMedal[],
): Promise<{ category: MenteCategory; tier: MedalTier }[]> {
  const fresh = MENTE_CATEGORIES.flatMap((cat) =>
    medalsToAward(cat, streaks[cat], existing.filter((m) => m.category === cat).map((m) => m.tier)),
  );
  if (fresh.length === 0) return [];

  const { error } = await supabase
    .from('mente_medals')
    .upsert(
      fresh.map((f) => ({ user_id: userId, category: f.category, tier: f.tier })),
      { onConflict: 'user_id,category,tier', ignoreDuplicates: true },
    );
  if (error) {
    logWarn('[mente] syncMenteMedals:', error.message);
    return [];
  }
  return fresh;
}
