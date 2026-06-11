import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { computeEdadAtpV2FromInputs, type EdadAtpV2Inputs } from '../edad-atp-v2-service';
import { computeSFGlobalReal } from '../sf-9band-service';
import { SF_DOMAIN_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import type { DomainKey } from '@/src/types/edad-atp-v2';

const fx = JSON.parse(readFileSync(join(__dirname, 'fixtures/hombres_v7.json'), 'utf-8'));

describe('REGRESIÓN E2E — paciente HOMBRES V7 (flow completo desde param_values)', () => {
  it('matriz → SF → Excel reproduce PhenoAge/SF/Ritmo/G37 del Excel', () => {
    // 1. SF real desde los 92 valores (gate).
    const sf = computeSFGlobalReal(fx.param_values, 'male', SF_DOMAIN_WEIGHTS as Record<DomainKey, number>);
    expect(sf.sf).toBeCloseTo(0.6083, 2); // 0.6066 ≈ 0.6083 ± 0.005

    // 2. Inputs del paciente: PhenoAge biomarkers + composición (del fixture) + SF domain_scores.
    const inputs: EdadAtpV2Inputs = {
      chronological_age: 50,
      sex: 'male',
      phenoage_biomarkers: { ...fx.expected_phenoage_inputs, crp_mg_dl: fx.expected_phenoage_inputs.pcr_mg_dl },
      domain_scores: sf.domain_scores as EdadAtpV2Inputs['domain_scores'],
      body_composition: { weight_kg: 87.4, height_cm: 183, body_fat_pct: 24.2, skeletal_muscle_pct: 34.6, visceral_fat: 10, grip_strength_kg: 57.4 },
      metabolic: {},
      cardiovascular: { total_cholesterol_mg_dl: 189, hdl_mg_dl: 38, systolic_bp_mmHg: 132, on_htn_treatment: false, has_diabetes: false, smoker: false },
      fitness: {},
      paramValues: fx.param_values,
    };
    const r = computeEdadAtpV2FromInputs(inputs);

    // 3. Verificaciones contra el Excel (fx.expected_results).
    expect(r.phenoage).toBeCloseTo(40.897, 1);            // PhenoAge Levine
    expect(r.sf_score).toBeCloseTo(0.6083, 2);            // SF global
    expect(r.ritmo_envejecimiento).toBeGreaterThan(14.4); // Ritmo ≈ 14.66
    expect(r.ritmo_envejecimiento).toBeLessThan(14.9);
    expect(r.algoritmo_excel).toBeGreaterThan(54.0);      // G37 ≈ 54.55
    expect(r.algoritmo_excel).toBeLessThan(55.1);
    expect(r.edad_integral).toBeCloseTo(r.algoritmo_excel, 5); // sin cognitivo → Integral = G37
  });

  it('sub-edades display se calculan desde los param_values (no degeneradas)', () => {
    const inputs: EdadAtpV2Inputs = {
      chronological_age: 50, sex: 'male',
      phenoage_biomarkers: { ...fx.expected_phenoage_inputs, crp_mg_dl: fx.expected_phenoage_inputs.pcr_mg_dl },
      domain_scores: {},
      body_composition: { weight_kg: 87.4, height_cm: 183, body_fat_pct: 24.2, skeletal_muscle_pct: 34.6, visceral_fat: 10 },
      metabolic: {}, cardiovascular: { total_cholesterol_mg_dl: 189, hdl_mg_dl: 38, systolic_bp_mmHg: 132, on_htn_treatment: false, has_diabetes: false, smoker: false }, fitness: {},
      paramValues: fx.param_values,
    };
    const r = computeEdadAtpV2FromInputs(inputs);
    expect(r.sub_edades.cardiovascular.ce_percent).toBeGreaterThan(70);
    expect(r.sub_edades.metabolica.ce_percent).toBeGreaterThan(0);
    expect(Number.isFinite(r.sub_edades.cardiovascular.age_years)).toBe(true);
  });
});
