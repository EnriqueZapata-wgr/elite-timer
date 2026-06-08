/**
 * PhenoAge — Levine et al. 2018.
 * Calcula la edad fenotípica (G30) a partir de 9 biomarcadores + edad cronológica.
 * EDAD ATP Sprint 1/N.
 *
 * Verificado contra el paciente ejemplo HOMBRES V7 (50 años):
 *   xb ≈ -9.158, Mort_Score ≈ 0.02057, PhenoAge ≈ 40.897.
 */
import type { PhenoAgeBiomarkers } from '@/src/types/edad-atp-v2';
import {
  PHENOAGE_INTERCEPT,
  PHENOAGE_COEFFICIENTS,
  PHENOAGE_GAMMA,
  PHENOAGE_T_MONTHS,
  PHENOAGE_A,
  PHENOAGE_B,
  PHENOAGE_C,
  UNIT_CONVERSIONS,
} from '@/src/constants/edad-atp-v2-model';

export type PhenoAgeBiomarkersConverted = {
  albumin_g_l: number;
  creatinine_umol_l: number;
  glucose_mmol_l: number;
  ln_crp: number;
  lymphocyte_pct: number;
  mcv_fl: number;
  rdw_cv_pct: number;
  alp_u_l: number;
  wbc_thousands: number;
  age: number;
};

/**
 * Convierte los biomarcadores a las unidades que requiere la fórmula de Levine.
 * CRP: ln(CRP_mg/dL × 10) — convención verificada contra el Excel (HOMBRES V7).
 */
export function convertBiomarkersToVc(b: PhenoAgeBiomarkers): PhenoAgeBiomarkersConverted {
  return {
    albumin_g_l: b.albumin_g_dl * UNIT_CONVERSIONS.albumin_g_dl_to_g_l,
    creatinine_umol_l: b.creatinine_mg_dl * UNIT_CONVERSIONS.creatinine_mg_dl_to_umol_l,
    glucose_mmol_l: b.glucose_mg_dl * UNIT_CONVERSIONS.glucose_mg_dl_to_mmol_l,
    // Guard contra CRP=0 → -Infinity. Para valores reales (>0) no cambia nada.
    ln_crp: Math.log(Math.max(b.crp_mg_dl, 1e-6) * UNIT_CONVERSIONS.crp_ln_multiplier),
    lymphocyte_pct: b.lymphocyte_pct,
    mcv_fl: b.mcv_fl,
    rdw_cv_pct: b.rdw_cv_pct,
    alp_u_l: b.alp_u_l,
    wbc_thousands: b.wbc_per_ul * UNIT_CONVERSIONS.wbc_per_ul_to_thousands,
    age: b.chronological_age,
  };
}

/** xb = intercept + Σ(K_i × VC_i). */
export function calculateXb(vc: PhenoAgeBiomarkersConverted): number {
  const k = PHENOAGE_COEFFICIENTS;
  return (
    PHENOAGE_INTERCEPT +
    k.albumin * vc.albumin_g_l +
    k.creatinine * vc.creatinine_umol_l +
    k.glucose * vc.glucose_mmol_l +
    k.ln_crp * vc.ln_crp +
    k.lymphocyte * vc.lymphocyte_pct +
    k.mcv * vc.mcv_fl +
    k.rdw * vc.rdw_cv_pct +
    k.alp * vc.alp_u_l +
    k.wbc * vc.wbc_thousands +
    k.age * vc.age
  );
}

/** Mort_Score = 1 − exp(−exp(xb) × (exp(γ·t) − 1) / γ) — CDF Gompertz a 120 meses. */
export function calculateMortScore(xb: number): number {
  const term = (Math.exp(PHENOAGE_GAMMA * PHENOAGE_T_MONTHS) - 1) / PHENOAGE_GAMMA;
  return 1 - Math.exp(-Math.exp(xb) * term);
}

/** PhenoAge = A + ln(B × ln(1 − Mort_Score)) / C. */
export function calculatePhenoAge(mortScore: number): number {
  return PHENOAGE_A + Math.log(PHENOAGE_B * Math.log(1 - mortScore)) / PHENOAGE_C;
}

/** Orquesta los 3 pasos: conversión → xb → mort_score → PhenoAge. */
export function computePhenoAge(biomarkers: PhenoAgeBiomarkers): {
  phenoage: number;
  xb: number;
  mort_score: number;
} {
  const vc = convertBiomarkersToVc(biomarkers);
  const xb = calculateXb(vc);
  const mort_score = calculateMortScore(xb);
  const phenoage = calculatePhenoAge(mort_score);
  return { phenoage, xb, mort_score };
}
