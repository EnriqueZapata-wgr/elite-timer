/**
 * Tests del núcleo de Journal (antes journal-service.test.ts sobre
 * journal-logic; renombrados en CIERRE-6 al par core/service del proyecto).
 */
import { describe, expect, it } from 'vitest';

import {
  computeJournalStreak, dateNDaysAgo,
  escapeSearchTerm, normalizeJournalEntry, DEFAULT_JOURNAL_TYPE,
} from '../journal-core';

const TODAY = '2026-07-07';

describe('dateNDaysAgo', () => {
  it('resta días dentro del mes', () => {
    expect(dateNDaysAgo(1, TODAY)).toBe('2026-07-06');
    expect(dateNDaysAgo(6, TODAY)).toBe('2026-07-01');
  });

  it('cruza meses y años', () => {
    expect(dateNDaysAgo(7, TODAY)).toBe('2026-06-30');
    expect(dateNDaysAgo(400, '2026-02-05')).toBe('2025-01-01');
  });
});

describe('computeJournalStreak', () => {
  it('sin entradas → 0', () => {
    expect(computeJournalStreak([], TODAY)).toBe(0);
  });

  it('racha que termina hoy', () => {
    expect(computeJournalStreak(['2026-07-07', '2026-07-06', '2026-07-05'], TODAY)).toBe(3);
  });

  it('racha viva anclada en ayer (hoy aún no escribe)', () => {
    expect(computeJournalStreak(['2026-07-06', '2026-07-05'], TODAY)).toBe(2);
  });

  it('última entrada antier → racha muerta (0)', () => {
    expect(computeJournalStreak(['2026-07-05', '2026-07-04'], TODAY)).toBe(0);
  });

  it('hueco rompe la racha', () => {
    expect(computeJournalStreak(['2026-07-07', '2026-07-06', '2026-07-03'], TODAY)).toBe(2);
  });

  it('fechas duplicadas (2 entradas el mismo día) cuentan como 1', () => {
    expect(computeJournalStreak(['2026-07-07', '2026-07-07', '2026-07-06'], TODAY)).toBe(2);
  });

  it('orden de entrada no importa', () => {
    expect(computeJournalStreak(['2026-07-05', '2026-07-07', '2026-07-06'], TODAY)).toBe(3);
  });

  it('racha larga cruzando mes', () => {
    const dates = Array.from({ length: 10 }, (_, i) => dateNDaysAgo(i, TODAY));
    expect(computeJournalStreak(dates, TODAY)).toBe(10);
  });
});

describe('escapeSearchTerm', () => {
  it('sin término → null (el filtro no se aplica)', () => {
    expect(escapeSearchTerm(null)).toBeNull();
    expect(escapeSearchTerm(undefined)).toBeNull();
    expect(escapeSearchTerm('')).toBeNull();
    expect(escapeSearchTerm('   ')).toBeNull();
  });

  it('recorta espacios de los lados', () => {
    expect(escapeSearchTerm('  gratitud  ')).toBe('gratitud');
  });

  it('un término normal pasa intacto', () => {
    expect(escapeSearchTerm('mi mamá')).toBe('mi mamá');
  });

  it('escapa % y _ para que se busquen como letras, no como comodines', () => {
    // Sin esto, buscar "100%" trae TODO el journal: justo lo contrario de buscar.
    expect(escapeSearchTerm('100%')).toBe('100\\%');
    expect(escapeSearchTerm('_borrador')).toBe('\\_borrador');
    expect(escapeSearchTerm('50%_ok')).toBe('50\\%\\_ok');
  });
});

describe('normalizeJournalEntry', () => {
  it('una entrada anterior a la migración 035 recibe el tipo por defecto', () => {
    // Sin esto se pinta sin categoría y se cae de los filtros por tipo.
    const row = { id: 'a', date: '2026-07-07', content: 'texto' };
    expect(normalizeJournalEntry(row).journal_type).toBe(DEFAULT_JOURNAL_TYPE);
    expect(normalizeJournalEntry(row).journal_type).toBe('free');
  });

  it('un journal_type existente NO se pisa', () => {
    expect(normalizeJournalEntry({ journal_type: 'stoic' }).journal_type).toBe('stoic');
  });

  it('el resto de los campos viaja intacto', () => {
    const row = { id: 'x1', date: '2026-07-07', content: 'hola', tags: ['a'] };
    const out = normalizeJournalEntry(row);
    expect(out.id).toBe('x1');
    expect(out.content).toBe('hola');
    expect(out.tags).toEqual(['a']);
  });
});
