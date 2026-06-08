import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { computeCEFromData, unifiedToCEData, CE_PHENOAGE_KEYS, CE_DOMAINS } from '../ce-service';
import type { UnifiedUserData } from '../edad-atp-v2-service';

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

describe('CE — unifiedToCEData (lectura desde fuentes existentes)', () => {
  it('labs (glucose/creatinine/pcr/wbc) cuentan como biomarkers presentes', () => {
    const data: UnifiedUserData = {
      chronological_age: 45, sex: 'male',
      glucose_mg_dl: 90, creatinine_mg_dl: 0.9, pcr_mg_dl: 0.2, wbc_per_ul: 6000,
      data_sources_used: ['lab_results'],
    };
    const ce = unifiedToCEData(data);
    expect(ce.presentBiomarkerKeys.sort()).toEqual(['creatinine', 'crp', 'glucose', 'wbc']);
    expect(ce.hasComposition).toBe(false);
    expect(ce.hasCognitive).toBe(false);
  });

  it('composición requiere weight+height+bodyfat; cognitivo requiere ambos RT', () => {
    const base: UnifiedUserData = { chronological_age: 40, sex: 'male', data_sources_used: [] };
    expect(unifiedToCEData({ ...base, weight_kg: 80, height_cm: 178 }).hasComposition).toBe(false);
    expect(unifiedToCEData({ ...base, weight_kg: 80, height_cm: 178, body_fat_pct: 18 }).hasComposition).toBe(true);
    expect(unifiedToCEData({ ...base, reaction_time_simple_ms: 280 }).hasCognitive).toBe(false);
    expect(unifiedToCEData({ ...base, reaction_time_simple_ms: 280, reaction_time_choice_ms: 420 }).hasCognitive).toBe(true);
  });

  it('dominios contestados se reflejan en presentDomains', () => {
    const data: UnifiedUserData = {
      chronological_age: 40, sex: 'male',
      sf_scores_by_domain: { metabolismo: 50, sueno: 50 },
      data_sources_used: ['edad_atp_questionnaire_responses'],
    };
    expect(unifiedToCEData(data).presentDomains.sort()).toEqual(['metabolismo', 'sueno']);
  });
});
