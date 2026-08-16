/**
 * Lectura del dominio journal (OLA1 R-1).
 *
 * journal-service devuelve [] cuando la consulta falla, y con eso el shell no
 * puede distinguir "no escribiste nada" de "no pudimos leer". Aquí se lee lo
 * mismo pero se LANZA: esa diferencia es la que le permite a la pantalla decir
 * la verdad en vez de mostrar un vacío que no es cierto.
 *
 * El rango del shell decide la ventana de la lista. El streak NO se recorta al
 * rango: una racha de 40 días sigue siendo de 40 días aunque estés viendo la
 * semana.
 */
import { supabase } from '@/src/lib/supabase';
import { computeJournalStreak, dateNDaysAgo } from '@/src/services/journal-core';
import type { JournalEntry } from '@/src/services/journal-core';
import type { ResolvedRange } from './report-domain-core';

/** Techo de filas de la lista. Arriba de esto ya nadie desplaza, y el rango existe. */
export const JOURNAL_ROW_CAP = 500;

/** Días hacia atrás que se miran para la racha. */
const STREAK_LOOKBACK_DAYS = 400;

export interface JournalReportData {
  entries: JournalEntry[];
  /** Días seguidos escribiendo, contados sobre TODO el historial reciente. */
  streak: number;
}

export async function loadJournalReport(range: ResolvedRange): Promise<JournalReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  let listQuery = supabase
    .from('journal_entries')
    .select('id, date, journal_type, prompt, content, tags, created_at, updated_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(JOURNAL_ROW_CAP);
  if (range.from) listQuery = listQuery.gte('date', range.from);

  const [list, dates] = await Promise.all([
    listQuery,
    supabase
      .from('journal_entries')
      .select('date')
      .eq('user_id', userId)
      .gte('date', dateNDaysAgo(STREAK_LOOKBACK_DAYS))
      .order('date', { ascending: false }),
  ]);

  if (list.error) throw list.error;
  if (dates.error) throw dates.error;

  const entries = ((list.data ?? []) as any[]).map((row) => ({
    ...row,
    journal_type: row.journal_type ?? 'free',
  })) as JournalEntry[];

  const dayList = ((dates.data ?? []) as { date: string }[]).map((r) => String(r.date).slice(0, 10));

  return { entries, streak: computeJournalStreak(dayList) };
}
