/**
 * mi-expediente-core — guard del timeline (B5).
 */
import { describe, it, expect } from 'vitest';
import { buildTimeline, groupByMonth, shortDate, type TimelineSources } from '../mi-expediente-core';

const EMPTY: TimelineSources = { symptoms: [], interventionsActivated: [], labs: [], measurements: [], glucose: [], ketones: [] };

describe('buildTimeline', () => {
  it('fusiona fuentes y ordena más reciente primero', () => {
    const src: TimelineSources = {
      ...EMPTY,
      symptoms: [{ id: 's1', name: 'Fatiga', started_at: '2026-07-01T10:00:00Z', resolved_at: '2026-07-05T10:00:00Z', severity: 3 }],
      interventionsActivated: [{ id: 'i1', name: 'Sol matutino', activated_at: '2026-07-10T10:00:00Z' }],
      labs: [{ marker: 'PCR', measured_at: '2026-06-20T10:00:00Z' }],
    };
    const t = buildTimeline(src);
    // Orden desc: activación (07-10) > resuelto (07-05) > inicio síntoma (07-01) > lab (06-20)
    expect(t.map(e => e.kind)).toEqual(['intervention_activated', 'symptom_resolved', 'symptom_start', 'lab']);
  });

  it('un síntoma activo genera solo el evento de inicio', () => {
    const t = buildTimeline({ ...EMPTY, symptoms: [{ id: 's', name: 'Ansiedad', started_at: '2026-07-14T00:00:00Z', resolved_at: null, severity: 2 }] });
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe('symptom_start');
  });

  it('descarta fechas inválidas', () => {
    const t = buildTimeline({ ...EMPTY, glucose: [{ value: 90, at: 'no-date' }] });
    expect(t).toHaveLength(0);
  });
});

describe('groupByMonth', () => {
  it('agrupa por mes preservando orden', () => {
    const src: TimelineSources = {
      ...EMPTY,
      glucose: [{ value: 90, at: '2026-07-16T10:00:00Z' }, { value: 95, at: '2026-06-10T10:00:00Z' }],
    };
    const groups = groupByMonth(buildTimeline(src));
    expect(groups.map(g => g.month)).toEqual(['julio 2026', 'junio 2026']);
  });
});

describe('shortDate', () => {
  it('formatea "16 jul"', () => {
    expect(shortDate('2026-07-16T10:00:00Z')).toBe('16 jul');
    expect(shortDate('bad')).toBe('');
  });
});
