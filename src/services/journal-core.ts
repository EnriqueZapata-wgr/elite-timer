/**
 * journal-core — Journal, lógica pura (#39). Sin imports de supabase/RN para
 * que sea testeable en vitest node (el import de supabase arrastra
 * react-native, cuya sintaxis Flow rompe el parser).
 *
 * CIERRE-6: se llamaba journal-logic.ts, único `-logic` del repo cuando la
 * convención es `-core`. Además absorbe lo que quedaba de lógica pura suelta
 * dentro de journal-service (escape de búsqueda y normalización de fila) y
 * los tipos del dominio, que vivían en el servicio y obligaban a
 * journal-report-core a importar DE un servicio para tipar. Un core no debe
 * depender de un service: ahora los tipos nacen aquí.
 */
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';

// ─── Tipos del dominio ──────────────────────────────────────────────────────

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

/** Tipo por defecto de una entrada vieja sin `journal_type`. */
export const DEFAULT_JOURNAL_TYPE = 'free';

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

// ─── Búsqueda y normalización ───────────────────────────────────────────────

/**
 * Escapa `%` y `_` para que el usuario busque esos caracteres como literales
 * y no como comodines de LIKE. Sin esto, buscar "100%" trae TODO el journal,
 * que es justo lo contrario de buscar.
 *
 * Devuelve null si no hay término real (vacío o puros espacios): el llamador
 * lo usa para decidir si aplica el filtro o lo omite.
 */
export function escapeSearchTerm(search: string | null | undefined): string | null {
  if (!search) return null;
  const term = search.trim();
  if (term.length === 0) return null;
  return term.replace(/[%_]/g, '\\$&');
}

/**
 * Normaliza una fila cruda. Las entradas anteriores a la migración 035 no
 * traen `journal_type`; sin esto se pintan sin categoría y se caen de los
 * filtros por tipo.
 */
export function normalizeJournalEntry(row: Partial<JournalEntry>): JournalEntry {
  return {
    ...row,
    journal_type: row.journal_type ?? DEFAULT_JOURNAL_TYPE,
  } as JournalEntry;
}
