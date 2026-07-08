import { describe, expect, it } from 'vitest';

import { computeJournalStreak, dateNDaysAgo } from '../journal-logic';

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
