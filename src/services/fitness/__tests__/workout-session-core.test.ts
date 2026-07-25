import { describe, it, expect } from 'vitest';
import {
  computeSessionSummary,
  computePRUpdates,
  epley1RM,
  CELEBRACION_MEJORA_PCT,
  type SessionSet,
} from '../workout-session-core';

const set = (slug: string, setNumber: number, reps: number, weightKg: number | null = null, esIsometrico = false): SessionSet =>
  ({ slug, nombre: slug, setNumber, reps, weightKg, esIsometrico, metodo: 'Estándar' });

describe('epley1RM', () => {
  it('mismo criterio que log-exercise', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley1RM(0, 5)).toBe(0);
  });
});

describe('computeSessionSummary', () => {
  it('ejercicios únicos, sets válidos y volumen kg×reps', () => {
    const r = computeSessionSummary([
      set('a', 1, 10, 50), set('a', 2, 8, 50), set('b', 1, 12, null), set('c', 1, 0, 20),
    ]);
    expect(r.exercisesCount).toBe(2); // c no tiene reps
    expect(r.setsCount).toBe(3);
    expect(r.volumeKg).toBe(10 * 50 + 8 * 50);
  });

  it('isométricos no suman volumen (segundos ≠ reps)', () => {
    const r = computeSessionSummary([set('plank', 1, 90, null, true)]);
    expect(r.setsCount).toBe(1);
    expect(r.volumeKg).toBe(0);
  });
});

describe('computePRUpdates', () => {
  it('detecta PR nuevo y mejora sobre previo', () => {
    const prs = computePRUpdates(
      [set('squat', 1, 5, 100), set('squat', 2, 5, 110), set('curl', 1, 10, 20)],
      { squat: 120 },
    );
    // squat: e1RM(110,5) = 128.3 > 120 → PR con mejora ~6.9%
    const squat = prs.find((p) => p.slug === 'squat')!;
    expect(squat.new1RM).toBeCloseTo(128.3, 1);
    expect(squat.mejoraPct).toBeCloseTo(6.9, 1);
    expect(squat.celebrar).toBe(false);
    // curl: primer PR (sin previo) → sin % pero sí PR
    const curl = prs.find((p) => p.slug === 'curl')!;
    expect(curl.prev1RM).toBeNull();
    expect(curl.celebrar).toBe(false);
  });

  it('brinco >15% ⇒ celebrar (doctrina carrot)', () => {
    const prs = computePRUpdates([set('squat', 1, 5, 130)], { squat: 120 });
    expect(prs[0].mejoraPct).toBeGreaterThan(CELEBRACION_MEJORA_PCT);
    expect(prs[0].celebrar).toBe(true);
  });

  it('sin mejora ⇒ sin PR; isométricos no compiten', () => {
    expect(computePRUpdates([set('squat', 1, 5, 80)], { squat: 120 })).toHaveLength(0);
    expect(computePRUpdates([set('plank', 1, 120, null, true)], {})).toHaveLength(0);
  });
});
