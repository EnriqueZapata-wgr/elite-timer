import { describe, it, expect, vi } from 'vitest';

// curves-engine importa @/src/lib/supabase (date-helpers es puro, no se mockea).
vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));

import { computeEWMA, interpolateCurve } from '../curves-engine';

describe('curves-engine — computeEWMA (pure)', () => {
  it('serie constante converge al valor', () => {
    expect(computeEWMA([10, 10, 10, 10, 10, 10, 10], 0.3)).toBeCloseTo(10, 2);
  });

  it('el último valor pesa más que el primero', () => {
    const result = computeEWMA([0, 0, 0, 0, 0, 0, 100], 0.3);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(30, 5); // 0.3*100 + 0.7*0
  });

  it('serie vacía → 0 (decisión documentada: no throw)', () => {
    expect(computeEWMA([], 0.3)).toBe(0);
  });

  it('un solo valor → ese valor', () => {
    expect(computeEWMA([5], 0.3)).toBe(5);
  });
});

describe('curves-engine — interpolateCurve (pure)', () => {
  const curve = [
    { date: '2026-01-01', value: 10 },
    { date: '2026-01-11', value: 20 },
  ];

  it('interpola linealmente el punto medio', () => {
    expect(interpolateCurve(curve, '2026-01-06')).toBeCloseTo(15, 5);
  });

  it('fecha antes del primer punto → primer valor', () => {
    expect(interpolateCurve(curve, '2025-12-01')).toBe(10);
  });

  it('fecha después del último punto → último valor', () => {
    expect(interpolateCurve(curve, '2026-02-01')).toBe(20);
  });
});
