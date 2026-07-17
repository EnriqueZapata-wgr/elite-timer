/**
 * Invariantes del design system ATP (Batch 3 · #23): 3 colores (lime + teal
 * principales, amber secundario), un solo amarillo, degradados como superficie
 * de marca. Si esto truena, alguien rompió la doctrina de tokens.
 */
import { describe, expect, it } from 'vitest';

import { ATP_BRAND, SEMANTIC, SCORE_COLORS, PILLAR_GRADIENTS, brandGradient } from '../brand';

describe('doctrina 3 colores', () => {
  it('amber formalizado como amarillo secundario de marca', () => {
    expect(ATP_BRAND.amber).toBe('#EFD54F');
  });

  it('el amarillo es ÚNICO: los alias apuntan al mismo hex', () => {
    expect(SEMANTIC.acceptable).toBe(ATP_BRAND.amber);
    expect(SCORE_COLORS.stable).toBe(ATP_BRAND.amber);
  });

  it('moleculeGradient arranca en lime y termina en teal', () => {
    const g = ATP_BRAND.moleculeGradient;
    expect(g[0]).toBe(ATP_BRAND.lime);
    expect(g[g.length - 1]).toBe(ATP_BRAND.teal);
  });
});

describe('PILLAR_GRADIENTS', () => {
  it('cubre los pilares core', () => {
    for (const p of ['fitness', 'nutrition', 'mind', 'health', 'cycle', 'metrics', 'sleep'] as const) {
      expect(PILLAR_GRADIENTS[p]?.start, p).toBeTruthy();
      expect(PILLAR_GRADIENTS[p]?.end, p).toBeTruthy();
    }
  });
});

describe('brandGradient', () => {
  it('sin pilar → la molécula lime→teal', () => {
    expect(brandGradient()).toEqual(ATP_BRAND.moleculeGradient);
  });

  it('con pilar → [start, end] del gradient del pilar', () => {
    expect(brandGradient('mind')).toEqual([PILLAR_GRADIENTS.mind.start, PILLAR_GRADIENTS.mind.end]);
    expect(brandGradient('fitness')).toEqual([PILLAR_GRADIENTS.fitness.start, PILLAR_GRADIENTS.fitness.end]);
  });
});
