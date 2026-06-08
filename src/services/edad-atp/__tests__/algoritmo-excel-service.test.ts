import { describe, it, expect } from 'vitest';
import {
  computeAlgoritmoExcelFromComponents,
  computeAlgoritmoExcel,
} from '../algoritmo-excel-service';
import type { BodyComposition, DomainKey, PhenoAgeBiomarkers } from '@/src/types/edad-atp-v2';

const PATIENT_BIOMARKERS: PhenoAgeBiomarkers = {
  albumin_g_dl: 5.28, creatinine_mg_dl: 0.81, glucose_mg_dl: 90, crp_mg_dl: 0.18,
  lymphocyte_pct: 33, mcv_fl: 90, rdw_cv_pct: 12.8, alp_u_l: 71, wbc_per_ul: 7400,
  chronological_age: 50,
};
const PATIENT_COMPOSITION: BodyComposition = {
  weight_kg: 87.4, height_cm: 183, body_fat_pct: 24.2, skeletal_muscle_pct: 34.6,
  visceral_fat: 10, grip_strength_kg: 57.4, ffmi: 19.6,
};

describe('Algoritmo Excel — núcleo matemático (VERIFICADO celda por celda)', () => {
  it('paciente HOMBRES V7 con SF=0.6083 y ajuste −2 → 54.55', () => {
    const r = computeAlgoritmoExcelFromComponents({
      chronological_age: 50,
      phenoage: 40.897,
      sf_score: 0.6083,
      total_adjustment_years: -2,
    });
    expect(r.ritmo_envejecimiento).toBeCloseTo(14.66, 1);
    expect(r.edad_biologica_calculada).toBeCloseTo(61.10, 1);
    expect(r.edad_biologica_con_ajuste).toBeCloseTo(59.10, 1);
    // Con la corrección de ajustes (−2, no −1 hardcoded del Excel) → 54.55 (no 55.30).
    expect(r.algoritmo_excel).toBeCloseTo(54.55, 1);
  });

  it('SF=75% (threshold) → ritmo 12 (envejecimiento normal)', () => {
    const r = computeAlgoritmoExcelFromComponents({
      chronological_age: 50, phenoage: 50, sf_score: 0.75, total_adjustment_years: 0,
    });
    expect(r.ritmo_envejecimiento).toBeCloseTo(12, 5);
    expect(r.edad_biologica_calculada).toBeCloseTo(50, 5);
  });
});

describe('Algoritmo Excel — orquestador público (PhenoAge + ajuste exactos; SF placeholder)', () => {
  it('paciente HOMBRES V7: phenoage 40.90 y composición −2 exactos', () => {
    const scores: Partial<Record<DomainKey, number>> = {
      metabolismo: 52.87, habitos: 57.50, cardiovascular: 51.30, sueno: 60.08,
      sistema_hormonal: 62.00, vitalidad: 59.55, inflamacion: 66.22,
      composicion_corporal: 50.00, renal_micronutrientes: 82.42, inmunidad: 89.60,
    };
    const r = computeAlgoritmoExcel({
      chronological_age: 50,
      sex: 'male',
      phenoage_biomarkers: PATIENT_BIOMARKERS,
      domain_scores: scores,
      body_composition: PATIENT_COMPOSITION,
    });
    expect(r.phenoage).toBeCloseTo(40.90, 1);
    expect(r.ce_excel).toBeCloseTo(1.0, 2); // 10/10 dominios presentes
    // Con pesos de dominio reales, el SF y el blend completo se reproducen exacto.
    expect(r.sf_score).toBeCloseTo(0.6083, 3);
    expect(r.ritmo_envejecimiento).toBeCloseTo(14.66, 1);
    expect(r.edad_biologica_con_ajuste).toBeCloseTo(59.10, 1);
    expect(r.algoritmo_excel).toBeCloseTo(54.55, 1);
  });
});
