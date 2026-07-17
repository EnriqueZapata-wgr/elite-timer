import { describe, expect, it } from 'vitest';

import { buildDoneIndex, applyDoneFromLogs, type DayLogEntry } from '../day-state-core';

const logs = (rows: Partial<DayLogEntry>[]): DayLogEntry[] =>
  rows.map((r) => ({ name: r.name ?? '', interventionKey: r.interventionKey ?? null, status: r.status ?? 'pending' }));

describe('buildDoneIndex (#30 F1 — un estado del día)', () => {
  it('solo instancias completed entran al índice', () => {
    const idx = buildDoneIndex(logs([
      { name: 'Grounding 10-15 min', interventionKey: 'grounding', status: 'completed' },
      { name: 'Hora de dormir', interventionKey: 'recordatorio_dormir', status: 'pending' },
      { name: 'Meditar', status: 'snoozed' },
    ]));
    expect(idx.keys.has('grounding')).toBe(true);
    expect(idx.keys.has('recordatorio_dormir')).toBe(false);
    expect(idx.concepts.has('grounding')).toBe(true);
  });
});

describe('applyDoneFromLogs', () => {
  it('log completed por intervention_key ⇒ item done', () => {
    const items = [{ name: 'Grounding 10-15 min', completed: false, interventionKey: 'grounding' }];
    const idx = buildDoneIndex(logs([{ name: 'Grounding', interventionKey: 'grounding', status: 'completed' }]));
    applyDoneFromLogs(items, idx);
    expect(items[0].completed).toBe(true);
  });

  it('log completed por concepto canónico (cross-vocabulario) ⇒ item done', () => {
    // "Exposición solar matutina" (AGENDA) y "Luz solar" (HOY) = familia 'sol'.
    const items = [{ name: 'Luz solar', completed: false }];
    const idx = buildDoneIndex(logs([{ name: 'Exposición solar matutina (Fitzpatrick)', status: 'completed' }]));
    applyDoneFromLogs(items, idx);
    expect(items[0].completed).toBe(true);
  });

  it('OR determinístico: item ya done NO se des-marca aunque el log esté pending', () => {
    const items = [{ name: 'Grounding 10-15 min', completed: true, interventionKey: 'grounding' }];
    const idx = buildDoneIndex(logs([{ name: 'Grounding 10-15 min', interventionKey: 'grounding', status: 'pending' }]));
    applyDoneFromLogs(items, idx);
    expect(items[0].completed).toBe(true);
  });

  it('sin ninguna fuente ⇒ done=false', () => {
    const items = [{ name: 'Baño frío', completed: false }];
    applyDoneFromLogs(items, buildDoneIndex([]));
    expect(items[0].completed).toBe(false);
  });

  it('conceptos distintos no contaminan (drift resuelto por familia, no por fuzzy)', () => {
    const items = [{ name: 'Meditación matutina', completed: false }];
    const idx = buildDoneIndex(logs([{ name: 'Baño frío', status: 'completed' }]));
    applyDoneFromLogs(items, idx);
    expect(items[0].completed).toBe(false);
  });
});
