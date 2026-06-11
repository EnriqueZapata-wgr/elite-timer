import { describe, it, expect } from 'vitest';
import { scoreToEdadCiega, anclarEdad, getHabitosFactor } from '@/src/constants/edad-atp-motor-v2-config';

describe('scoreToEdadCiega — curva universal (8 puntos calibrados del Excel)', () => {
  it('reproduce los anchors de cada tramo', () => {
    expect(scoreToEdadCiega(100)).toBe(22);
    expect(scoreToEdadCiega(95)).toBe(22);
    expect(scoreToEdadCiega(90)).toBe(28);
    expect(scoreToEdadCiega(80)).toBe(33);
    expect(scoreToEdadCiega(70)).toBe(42);
    expect(scoreToEdadCiega(60)).toBe(50);
    expect(scoreToEdadCiega(50)).toBe(60);
    expect(scoreToEdadCiega(40)).toBe(70);
    expect(scoreToEdadCiega(30)).toBe(80);
    expect(scoreToEdadCiega(0)).toBe(100);
  });

  it('interpola linealmente dentro de cada tramo', () => {
    expect(scoreToEdadCiega(85)).toBeCloseTo(30.5, 5); // 33 - (5/10)*5
    expect(scoreToEdadCiega(75)).toBeCloseTo(37.5, 5); // 42 - (5/10)*9
    expect(scoreToEdadCiega(55)).toBeCloseTo(55, 5); // 60 - (5/10)*10
    expect(scoreToEdadCiega(92.5)).toBeCloseTo(25, 5); // 28 - (2.5/5)*6
  });

  it('es monótona decreciente (score alto = edad joven)', () => {
    let prev = scoreToEdadCiega(0);
    for (let s = 1; s <= 100; s++) {
      const cur = scoreToEdadCiega(s);
      expect(cur).toBeLessThanOrEqual(prev + 1e-9);
      prev = cur;
    }
  });

  it('clampa el extremo bajo en 100', () => {
    expect(scoreToEdadCiega(-50)).toBe(100);
  });
});

describe('anclarEdad — edad_aj = cron + (ciega − cron) × factor', () => {
  it('acerca la edad ciega a la cronológica', () => {
    expect(anclarEdad(39.8969, 50, 0.75)).toBeCloseTo(42.4227, 3); // H1 labs
    expect(anclarEdad(92.9167, 65, 0.65)).toBeCloseTo(83.1458, 3); // M2 fitness
  });
  it('factor 1 = sin anclaje; factor 0 = colapsa a cronológica', () => {
    expect(anclarEdad(30, 50, 1)).toBe(30);
    expect(anclarEdad(30, 50, 0)).toBe(50);
  });
});

describe('getHabitosFactor — bandas del Excel', () => {
  it('mapea score → factor', () => {
    expect(getHabitosFactor(95)).toBe(0.95);
    expect(getHabitosFactor(80)).toBe(0.95);
    expect(getHabitosFactor(79.9)).toBe(1.0);
    expect(getHabitosFactor(60)).toBe(1.0);
    expect(getHabitosFactor(45)).toBe(1.05);
    expect(getHabitosFactor(40)).toBe(1.05);
    expect(getHabitosFactor(39.9)).toBe(1.1);
    expect(getHabitosFactor(0)).toBe(1.1);
  });
});
