/**
 * Lógica PURA del dominio journal (OLA1 R-1): el filtro de tipo y búsqueda y
 * las filas del export.
 *
 * El filtro corre en memoria sobre lo que ya trajo el rango, no en la base.
 * Escribir en la caja de búsqueda dejó de ser una consulta por tecleo: son las
 * mismas entradas que ya estás viendo, y por eso el resultado no puede
 * contradecir a la lista.
 */
import type { JournalEntry } from '@/src/services/journal-service';
import type { ExportRow } from './report-domain-core';

/** Milisegundos de espera antes de aplicar lo que se escribió. */
export const JOURNAL_SEARCH_DEBOUNCE_MS = 350;

/**
 * Compara sin acentos ni mayúsculas: quien escribe "reunion" espera encontrar
 * "reunión", y al revés.
 */
export function normalizeSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface JournalFilterState {
  /** journal_type exacto. null = todos. */
  type: string | null;
  /** Texto ya "debounceado". Vacío = sin búsqueda. */
  search: string;
}

/** Busca en el contenido, en el prompt y en las etiquetas. */
export function entryMatchesSearch(entry: JournalEntry, needle: string): boolean {
  if (!needle) return true;
  const haystack = normalizeSearch(
    [entry.content, entry.prompt ?? '', (entry.tags ?? []).join(' ')].join(' '),
  );
  return haystack.includes(needle);
}

export function filterJournalEntries(
  entries: readonly JournalEntry[],
  filter: JournalFilterState,
): JournalEntry[] {
  const needle = normalizeSearch(filter.search);
  return entries.filter((e) => {
    if (filter.type && e.journal_type !== filter.type) return false;
    return entryMatchesSearch(e, needle);
  });
}

/** true si hay algún filtro puesto: cambia el copy del vacío. */
export function hasActiveFilter(filter: JournalFilterState): boolean {
  return filter.type !== null || normalizeSearch(filter.search).length > 0;
}

/**
 * El export lleva lo que estás viendo, filtros incluidos: si exportara la lista
 * completa mientras la pantalla muestra doce entradas, el archivo mentiría.
 */
export function journalRows(entries: readonly JournalEntry[]): ExportRow[] {
  return entries.map((e) => ({
    fecha: e.date,
    tipo: e.journal_type,
    pregunta: e.prompt ?? '',
    entrada: e.content,
    etiquetas: (e.tags ?? []).join(' '),
  }));
}
