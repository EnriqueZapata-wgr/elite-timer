/**
 * Pruebas del filtro del dominio journal (OLA1 R-1).
 *
 * El filtro dejó de correr en la base y corre en memoria: estas pruebas son
 * las que sostienen que buscar sigue encontrando lo mismo.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSearch, entryMatchesSearch, filterJournalEntries, hasActiveFilter, journalRows,
} from '../journal-report-core';
import type { JournalEntry } from '@/src/services/journal-core';

function entry(over: Partial<JournalEntry>): JournalEntry {
  return {
    id: 'id-1',
    date: '2026-08-10',
    journal_type: 'free',
    prompt: null,
    content: 'contenido',
    tags: null,
    created_at: '2026-08-10T10:00:00.000Z',
    updated_at: '2026-08-10T10:00:00.000Z',
    ...over,
  };
}

describe('normalizeSearch', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizeSearch('Reunión')).toBe('reunion');
    expect(normalizeSearch('  ÁRBOL  ')).toBe('arbol');
  });

  it('vacío o nulo es cadena vacía', () => {
    expect(normalizeSearch(null)).toBe('');
    expect(normalizeSearch(undefined)).toBe('');
    expect(normalizeSearch('   ')).toBe('');
  });
});

describe('entryMatchesSearch', () => {
  const e = entry({ content: 'Hoy salió el sol', prompt: '¿Qué agradeces?', tags: ['calma', 'trabajo'] });

  it('sin búsqueda, todo entra', () => {
    expect(entryMatchesSearch(e, '')).toBe(true);
  });

  it('busca en el contenido sin importar acentos', () => {
    expect(entryMatchesSearch(e, 'salio')).toBe(true);
  });

  it('busca también en la pregunta y en las etiquetas', () => {
    expect(entryMatchesSearch(e, 'agradeces')).toBe(true);
    expect(entryMatchesSearch(e, 'trabajo')).toBe(true);
  });

  it('lo que no está, no está', () => {
    expect(entryMatchesSearch(e, 'bicicleta')).toBe(false);
  });
});

describe('filterJournalEntries', () => {
  const list = [
    entry({ id: 'a', journal_type: 'gratitude', content: 'gracias por el día' }),
    entry({ id: 'b', journal_type: 'stoic', content: 'lo que no depende de mí' }),
    entry({ id: 'c', journal_type: 'gratitude', content: 'café con calma' }),
  ];

  it('sin filtros devuelve todo, en el mismo orden', () => {
    expect(filterJournalEntries(list, { type: null, search: '' }).map((e) => e.id))
      .toEqual(['a', 'b', 'c']);
  });

  it('el tipo recorta', () => {
    expect(filterJournalEntries(list, { type: 'gratitude', search: '' }).map((e) => e.id))
      .toEqual(['a', 'c']);
  });

  it('tipo y búsqueda se acumulan', () => {
    expect(filterJournalEntries(list, { type: 'gratitude', search: 'CAFE' }).map((e) => e.id))
      .toEqual(['c']);
  });

  it('sin coincidencias devuelve lista vacía, no la original', () => {
    expect(filterJournalEntries(list, { type: null, search: 'zzz' })).toEqual([]);
  });
});

describe('hasActiveFilter', () => {
  it('distingue filtro puesto de filtro en blanco', () => {
    expect(hasActiveFilter({ type: null, search: '' })).toBe(false);
    expect(hasActiveFilter({ type: null, search: '   ' })).toBe(false);
    expect(hasActiveFilter({ type: 'stoic', search: '' })).toBe(true);
    expect(hasActiveFilter({ type: null, search: 'sol' })).toBe(true);
  });
});

describe('journalRows', () => {
  it('una fila por entrada, con las columnas del export', () => {
    const rows = journalRows([entry({ prompt: '¿Qué aprendiste?', tags: ['a', 'b'] })]);
    expect(rows).toEqual([{
      fecha: '2026-08-10',
      tipo: 'free',
      pregunta: '¿Qué aprendiste?',
      entrada: 'contenido',
      etiquetas: 'a b',
    }]);
  });

  it('lo que falta va vacío, no undefined', () => {
    const rows = journalRows([entry({})]);
    expect(rows[0].pregunta).toBe('');
    expect(rows[0].etiquetas).toBe('');
  });
});
