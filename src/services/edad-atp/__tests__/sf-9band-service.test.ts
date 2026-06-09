import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeSFGlobalReal, score9Bands } from '../sf-9band-service';
import { SF_DOMAIN_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import type { DomainKey } from '@/src/types/edad-atp-v2';

const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures/hombres_v7.json'), 'utf-8'));

describe('sf-9band — lógica de bandas (ejemplos del buzón)', () => {
  it('LDL=149 → 80 (aceptable_3), ApoB=105 → 80 (optimo_2), Col total=189 → 100 (optimo_2)', () => {
    // bandLimits LDL: [30,50,60,80,120,150,160,180] → 149 ≤ 150 → SCORES_9[5] = 80
    expect(score9Bands(149, [30, 50, 60, 80, 120, 150, 160, 180])).toBe(80);
    // bandLimits ApoB: [30,0,40,50,99,110,125,150] → 105 ≤ 110 → SCORES_9[5] = 80
    expect(score9Bands(105, [30, 0, 40, 50, 99, 110, 125, 150])).toBe(80);
    // bandLimits Col total: [115,130,150,180,220,250,280,350] → 189 ≤ 220 → SCORES_9[4] = 100
    expect(score9Bands(189, [115, 130, 150, 180, 220, 250, 280, 350])).toBe(100);
  });

  it('null en bandLimits se salta al siguiente límite no-null', () => {
    // [null,null,null,0.3,1,1.2,1.5,1.6] → 0.57 ≤ 1 → SCORES_9[4] = 100
    expect(score9Bands(0.57, [null, null, null, 0.3, 1, 1.2, 1.5, 1.6])).toBe(100);
  });

  it('value > último límite → fuera de rango (0)', () => {
    expect(score9Bands(400, [115, 130, 150, 180, 220, 250, 280, 350])).toBe(0);
  });

  it('value null → null (No Data, no rompe CE)', () => {
    expect(score9Bands(null, [1, 2, 3, 4, 5, 6, 7, 8])).toBeNull();
  });
});

// 7 tests obligatorios (FIX_BANDS_EXCEL_LOGIC.md) — lógica asimétrica del Excel.
describe('score9Bands replica Excel V7 EXACTO', () => {
  it('LDL=149, bands [30,50,60,80,120,150,160,180] → 80 (aceptable_3, T<v<=U)', () => {
    expect(score9Bands(149, [30, 50, 60, 80, 120, 150, 160, 180])).toBe(80);
  });
  it('ApoB=105, bands [30,0,40,50,99,110,125,150] → 80 (aceptable_3)', () => {
    expect(score9Bands(105, [30, 0, 40, 50, 99, 110, 125, 150])).toBe(80);
  });
  it('Col total=189, bands [115,130,150,180,220,250,280,350] → 100 (óptimo_2)', () => {
    expect(score9Bands(189, [115, 130, 150, 180, 220, 250, 280, 350])).toBe(100);
  });
  it('Duración=6, bands [6,6,7,7.5,8.5,9,9.5,10] → 50 (Q<=v<R con P=Q)', () => {
    expect(score9Bands(6, [6, 6, 7, 7.5, 8.5, 9, 9.5, 10])).toBe(50);
  });
  it('Testosterona total=3.32, bands [3,4.5,6,7,12,null,null,null] → 25 (riesgo_-4)', () => {
    expect(score9Bands(3.32, [3, 4.5, 6, 7, 12, null, null, null])).toBe(25);
  });
  it('LH=0.62, bands [0.9,1,1.5,2,8,9,10,null] → 0 (crítico_-5)', () => {
    expect(score9Bands(0.62, [0.9, 1, 1.5, 2, 8, 9, 10, null])).toBe(0);
  });
  it('Energía despertar=4, bands [6,6,7,9,10,null,null,null] → 0 (value < P)', () => {
    expect(score9Bands(4, [6, 6, 7, 9, 10, null, null, null])).toBe(0);
  });
});

// ====== GATE DE VALIDACIÓN DEL SPRINT (reactivado tras FIX_BANDS_EXCEL_LOGIC) ======
describe('sf-9band — paciente HOMBRES V7 reproduce SF=0.6083 [GATE]', () => {
  it('computeSFGlobalReal con los 92 valores del Excel → SF ≈ 0.6083 ± 0.005', () => {
    const result = computeSFGlobalReal(
      fixture.param_values,
      'male',
      SF_DOMAIN_WEIGHTS as Record<DomainKey, number>,
    );
    expect(result.sf).toBeCloseTo(0.6083, 2); // toBeCloseTo(_, 2) ⇒ |diff| < 0.005
    expect(result.domain_scores.renal_micronutrientes).toBeCloseTo(82.42, 0);
  });
});
