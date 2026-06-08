import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { computeCEFromData, CE_PHENOAGE_KEYS, CE_DOMAINS } from '../ce-service';

describe('CE — computeCEFromData', () => {
  it('sin datos → 0%', () => {
    const r = computeCEFromData({ presentBiomarkerKeys: [], hasComposition: false, presentDomains: [], hasCognitive: false });
    expect(r.ce_integral).toBe(0);
  });

  it('todos los datos → 100%', () => {
    const r = computeCEFromData({
      presentBiomarkerKeys: [...CE_PHENOAGE_KEYS],
      hasComposition: true,
      presentDomains: [...CE_DOMAINS],
      hasCognitive: true,
    });
    expect(r.ce_integral).toBeCloseTo(100, 5);
    expect(r.breakdown.biomarkers).toBeCloseTo(100, 5);
  });

  it('solo biomarcadores completos → 40% (peso 0.4)', () => {
    const r = computeCEFromData({ presentBiomarkerKeys: [...CE_PHENOAGE_KEYS], hasComposition: false, presentDomains: [], hasCognitive: false });
    expect(r.ce_integral).toBeCloseTo(40, 5);
  });

  it('biomarcadores + composición + cognitivo (sin cuestionarios) → 70%', () => {
    const r = computeCEFromData({ presentBiomarkerKeys: [...CE_PHENOAGE_KEYS], hasComposition: true, presentDomains: [], hasCognitive: true });
    expect(r.ce_integral).toBeCloseTo(70, 5); // 40 + 20 + 10
  });

  it('breakdown refleja % por dimensión', () => {
    const r = computeCEFromData({
      presentBiomarkerKeys: CE_PHENOAGE_KEYS.slice(0, 5) as unknown as string[],
      hasComposition: false,
      presentDomains: CE_DOMAINS.slice(0, 5),
      hasCognitive: false,
    });
    expect(r.breakdown.biomarkers).toBeCloseTo((5 / CE_PHENOAGE_KEYS.length) * 100, 3);
    expect(r.breakdown.questionnaires).toBeCloseTo(50, 3); // 5 de 10
  });
});
