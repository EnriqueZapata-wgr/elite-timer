/**
 * journal-service (#39, marathon F3) — SOLO I/O del historial de Journal.
 * La escritura del composer vive en app/journal.tsx; esto es la capa de
 * lectura/edición de la pantalla de historial.
 *
 * CIERRE-6: la lógica pura y los tipos se mudaron a journal-core.ts (antes
 * journal-logic.ts). Aquí no queda ninguna decisión, solo consultas.
 * Se re-exportan tipos y helpers para no romper a los que ya importaban
 * desde aquí, pero lo nuevo debe importar del core.
 */
import { supabase } from '@/src/lib/supabase';
import { dateNDaysAgo, escapeSearchTerm, normalizeJournalEntry } from './journal-core';

export { computeJournalStreak, dateNDaysAgo } from './journal-core';
export type { JournalEntry, JournalFilter } from './journal-core';

import type { JournalEntry, JournalFilter } from './journal-core';

export async function fetchJournalEntries(
  userId: string,
  filter: JournalFilter,
  limit = 200,
): Promise<JournalEntry[]> {
  let query = supabase
    .from('journal_entries')
    .select('id, date, journal_type, prompt, content, tags, created_at, updated_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter.rangeDays !== null) {
    query = query.gte('date', dateNDaysAgo(filter.rangeDays));
  }
  if (filter.type) {
    query = query.eq('journal_type', filter.type);
  }
  const term = escapeSearchTerm(filter.search);
  if (term) {
    query = query.ilike('content', `%${term}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Partial<JournalEntry>[]).map(normalizeJournalEntry);
}

/** Fechas con entrada (para el streak) — barato: solo columna date. */
export async function fetchJournalDates(userId: string, lookbackDays = 400): Promise<string[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('date')
    .eq('user_id', userId)
    .gte('date', dateNDaysAgo(lookbackDays))
    .order('date', { ascending: false });
  if (error || !data) return [];
  return (data as { date: string }[]).map((r) => String(r.date).slice(0, 10));
}

export async function updateJournalEntry(id: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteJournalEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  return !error;
}
