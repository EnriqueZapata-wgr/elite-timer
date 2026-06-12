/**
 * GATE Fase 2-4 (labs-ux) — lógica PURA testeable de los exit criteria:
 * CE→estrellas (#8), hash anti-recálculo (#15), ruteo de upload por tipo (#10/#11),
 * modelo de la gráfica de continuum (#4).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { ceToStars, starFills } from '@/src/components/edad-atp/ce-stars';
import { computeDatasetHash, entriesFromDict } from '../dataset-hash';
import { routeUploadByType, UPLOAD_TYPES } from '@/src/constants/upload-types';
import { buildChartModel } from '@/src/components/edad-atp/parameter-chart-model';
import { recalcStatus } from '../recalc-gate';

describe('ceToStars (#8) — CE 0-100 → estrellas 0-5 en pasos de 0.5', () => {
  it('mapea con la fórmula round(ce/100*5*2)/2', () => {
    expect(ceToStars(100)).toBe(5);
    expect(ceToStars(0)).toBe(0);
    expect(ceToStars(50)).toBe(2.5);
    expect(ceToStars(97)).toBe(5);   // 9.7 → round 10 → 5
    expect(ceToStars(90)).toBe(4.5); // 9.0 → 4.5
    expect(ceToStars(45)).toBe(2.5); // 4.5 → round 5 → 2.5
  });
  it('redondea a medio paso correctamente', () => {
    expect(ceToStars(30)).toBe(1.5); // 3.0 → 1.5
    expect(ceToStars(35)).toBe(2);   // 3.5 → round 4 → 2.0
    expect(ceToStars(80)).toBe(4);   // 8.0 → 4.0
  });
  it('clampa fuera de rango y maneja NaN', () => {
    expect(ceToStars(120)).toBe(5);
    expect(ceToStars(-10)).toBe(0);
    expect(ceToStars(NaN)).toBe(0);
  });
  it('starFills produce 5 estados full/half/empty', () => {
    expect(starFills(3.5)).toEqual(['full', 'full', 'full', 'half', 'empty']);
    expect(starFills(5)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(starFills(0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });
});

describe('computeDatasetHash (#15) — estable e insensible al orden', () => {
  it('mismo set en distinto orden → mismo hash', () => {
    const a = computeDatasetHash([{ key: 'glucosa', value: 90 }, { key: 'hdl', value: 55 }]);
    const b = computeDatasetHash([{ key: 'hdl', value: 55 }, { key: 'glucosa', value: 90 }]);
    expect(a).toBe(b);
  });
  it('cambiar un valor cambia el hash', () => {
    const a = computeDatasetHash([{ key: 'glucosa', value: 90 }]);
    const b = computeDatasetHash([{ key: 'glucosa', value: 91 }]);
    expect(a).not.toBe(b);
  });
  it('misma medición en distinta fecha → distinto hash (amerita recalcular)', () => {
    const a = computeDatasetHash([{ key: 'glucosa', value: 90, measured_at: '2026-01-01' }]);
    const b = computeDatasetHash([{ key: 'glucosa', value: 90, measured_at: '2026-05-01' }]);
    expect(a).not.toBe(b);
  });
  it('entriesFromDict aplana y es consistente', () => {
    const h1 = computeDatasetHash(entriesFromDict({ glucosa: 90, hdl: 55 }));
    const h2 = computeDatasetHash(entriesFromDict({ hdl: 55, glucosa: 90 }));
    expect(h1).toBe(h2);
  });
});

describe('routeUploadByType (#10/#11) — solo labs/composición escriben valores', () => {
  it('tipo 1 (labs) → extrae a lab_values', () => {
    expect(routeUploadByType('labs')).toEqual({ writesValues: true, target: 'lab_values', action: 'extract' });
  });
  it('tipo 2 (composición) → extrae a composición', () => {
    expect(routeUploadByType('composicion')).toEqual({ writesValues: true, target: 'composition', action: 'extract' });
  });
  it('tipos 3-7 → adjuntan contexto, NO escriben valores', () => {
    for (const id of ['diagnostico', 'genetico', 'densitometria', 'imagen', 'interpretacion']) {
      expect(routeUploadByType(id)).toEqual({ writesValues: false, target: 'context', action: 'attach' });
    }
  });
  it('tipo desconocido → contexto seguro (no corrompe labs)', () => {
    expect(routeUploadByType('???')).toEqual({ writesValues: false, target: 'context', action: 'attach' });
  });
  it('exactamente 2 de los 7 tipos tocan el motor', () => {
    expect(UPLOAD_TYPES.filter((t) => t.writesValues)).toHaveLength(2);
    expect(UPLOAD_TYPES).toHaveLength(7);
  });
});

describe('buildChartModel (#4) — serie + banda funcional', () => {
  const TODAY = '2026-06-12';
  // colesterol_hdl bandLimits: [30,40,50,60,100,null,null,null] → banda óptima [60,100].
  const HDL_LIMITS = [30, 40, 50, 60, 100, null, null, null];

  it('serie vacía → empty', () => {
    expect(buildChartModel([], HDL_LIMITS, TODAY).empty).toBe(true);
  });

  it('puntos ordenados → x uniforme 0..1, banda funcional presente', () => {
    const m = buildChartModel([
      { value: 45, measured_at: '2026-01-01', source: 'lab_pdf' },
      { value: 58, measured_at: '2026-03-01', source: 'lab_pdf' },
      { value: 72, measured_at: '2026-05-01', source: 'lab_pdf' },
    ], HDL_LIMITS, TODAY);
    expect(m.empty).toBe(false);
    expect(m.points.map((p) => p.x)).toEqual([0, 0.5, 1]);
    expect(m.band).not.toBeNull();
    expect(m.band!.lo).toBe(60);
    expect(m.band!.hi).toBe(100);
    // 72 cae en la banda óptima [60,100] → optimo; 45 por debajo → atención/aceptable.
    expect(m.points[2].status).toBe('optimo');
  });

  it('marca is_stale los > 365 días', () => {
    const m = buildChartModel([
      { value: 60, measured_at: '2024-01-01', source: 'lab_pdf' },
      { value: 65, measured_at: '2026-05-01', source: 'lab_pdf' },
    ], HDL_LIMITS, TODAY);
    expect(m.points[0].is_stale).toBe(true);
    expect(m.points[1].is_stale).toBe(false);
  });

  it('sin bandLimits (param fuera de matriz) → sin banda, no inventa rango', () => {
    const m = buildChartModel([{ value: 5, measured_at: '2026-05-01', source: 'manual' }], null, TODAY);
    expect(m.band).toBeNull();
    expect(m.points[0].status).toBe('aceptable'); // neutro sin banda
  });

  it('un solo punto → x centrado en 0.5', () => {
    const m = buildChartModel([{ value: 60, measured_at: '2026-05-01', source: 'lab_pdf' }], HDL_LIMITS, TODAY);
    expect(m.points[0].x).toBe(0.5);
  });
});

describe('recalcStatus (#15/#16) — gating de recálculo', () => {
  it('nunca calculado → hay datos nuevos', () => {
    expect(recalcStatus('abc', null)).toEqual({ hasNewData: true, unchanged: false });
  });
  it('mismo hash → sin cambios (no recalcular, no gastar)', () => {
    const s = recalcStatus('abc', { hash: 'abc', at: '2026-05-01' });
    expect(s.unchanged).toBe(true);
    expect(s.hasNewData).toBe(false);
    expect(s.lastAt).toBe('2026-05-01');
  });
  it('hash distinto → datos nuevos integrados', () => {
    const s = recalcStatus('xyz', { hash: 'abc', at: '2026-05-01' });
    expect(s.hasNewData).toBe(true);
    expect(s.unchanged).toBe(false);
  });
});
