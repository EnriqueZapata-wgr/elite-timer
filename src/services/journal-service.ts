/**
 * Journal service (#39, marathon F3) — historial con filtros + streak.
 * La escritura vive en app/journal.tsx (composer con 4 tipos); esto es
 * la capa de lectura/edición para la pantalla de historial.
 */
import { supabase } from '@/src/lib/supabase';
import { dateNDaysAgo } from './journal-logic';

export { computeJournalStreak, dateNDaysAgo } from './journal-logic';

export interface JournalEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  journal_type: string;  // free | gratitude | vision | stoic | work_dump
  prompt: string | null;
  content: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface JournalFilter {
  /** días hacia atrás desde hoy (null = todo) */
  rangeDays: number | null;
  /** journal_type exacto (null = todos) */
  type: string | null;
  /** búsqueda por contenido, case-insensitive (null = sin búsqueda) */
  search: string | null;
}

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
  if (filter.search && filter.search.trim().length > 0) {
    // escape de % y _ para que el usuario busque literales
    const term = filter.search.trim().replace(/[%_]/g, '\\$&');
    query = query.ilike('content', `%${term}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    ...row,
    journal_type: row.journal_type ?? 'free',
  })) as JournalEntry[];
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
