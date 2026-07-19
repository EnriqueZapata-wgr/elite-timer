/**
 * Regresión MB-5: pleasantness/energy_level del check-in.
 *
 * Bug original: la UI nunca escribía estos ejes → emotional_checkins.pleasantness
 * siempre null → day-compiler jamás detectaba mood bajo por pleasantness (solo
 * por quadrant). deriveCheckinAxes los deriva del modelo RULER.
 */
import { describe, it, expect } from 'vitest';
import { deriveCheckinAxes } from '../checkin-axes-core';

describe('deriveCheckinAxes', () => {
  it('cuadrante desagradable → pleasantness bajo (isLow de day-compiler: <= 4)', () => {
    const r = deriveCheckinAxes('low_unpleasant', [{ energy: 2, intensity: 6 }]);
    expect(r.pleasantness).toBeLessThanOrEqual(4);
    expect(r.energy_level).toBe(2);
  });

  it('cuadrante agradable → pleasantness alto (> 4, nunca dispara isLow)', () => {
    const r = deriveCheckinAxes('high_pleasant', [{ energy: 9, intensity: 8 }]);
    expect(r.pleasantness).toBeGreaterThan(4);
    expect(r.energy_level).toBe(9);
  });

  it('más intensidad = más extremo en el eje del cuadrante', () => {
    const suave = deriveCheckinAxes('high_unpleasant', [{ energy: 8, intensity: 2 }]);
    const fuerte = deriveCheckinAxes('high_unpleasant', [{ energy: 8, intensity: 10 }]);
    expect(fuerte.pleasantness).toBeLessThan(suave.pleasantness);
  });

  it('promedia varias emociones', () => {
    const r = deriveCheckinAxes('low_pleasant', [
      { energy: 2, intensity: 4 },
      { energy: 4, intensity: 8 },
    ]);
    expect(r.energy_level).toBe(3); // (2+4)/2
    expect(r.pleasantness).toBe(8); // 5 + 6/2
  });

  it('sin emociones válidas cae al centro del semieje (7/3)', () => {
    expect(deriveCheckinAxes('high_pleasant', [])).toEqual({ pleasantness: 7, energy_level: 7 });
    expect(deriveCheckinAxes('low_unpleasant', [{ energy: NaN, intensity: 3 }]))
      .toEqual({ pleasantness: 3, energy_level: 3 });
  });

  it('resultado siempre en 1-10', () => {
    const r = deriveCheckinAxes('high_unpleasant', [{ energy: 10, intensity: 10 }]);
    expect(r.pleasantness).toBeGreaterThanOrEqual(1);
    expect(r.energy_level).toBeLessThanOrEqual(10);
  });
});
