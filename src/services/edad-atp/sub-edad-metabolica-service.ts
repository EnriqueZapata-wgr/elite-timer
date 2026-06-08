/**
 * Sub-edad Metabólica (display). EDAD ATP Sprint 1/N.
 * Pesos §4.1 del doc maestro. Normas públicas ADA/EASD (v1).
 * // TODO Mariana Sprint 5: validate cutoffs.
 */
import type { Sex, SubEdadResult } from '@/src/types/edad-atp-v2';
import { SUB_EDAD_METABOLICA_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import { buildSubEdadResult, bandScore, type ComponentInput } from './sub-edad-common';

function scoreHomaIr(homa: number): number {
  return bandScore(homa, [
    { test: (v) => v < 1, score: 95 },   // óptimo
    { test: (v) => v < 2, score: 75 },   // normal
    { test: (v) => v < 3, score: 45 },   // RI temprana
    { test: () => true, score: 20 },     // RI significativa
  ]);
}
function scoreHba1c(h: number): number {
  return bandScore(h, [
    { test: (v) => v < 5.4, score: 95 },
    { test: (v) => v < 5.7, score: 80 },
    { test: (v) => v < 6.5, score: 45 }, // prediabetes
    { test: () => true, score: 20 },     // diabetes
  ]);
}
function scoreTrigsHdl(ratio: number): number {
  return bandScore(ratio, [
    { test: (v) => v < 2, score: 95 },
    { test: (v) => v < 3, score: 70 },
    { test: (v) => v < 4, score: 40 },
    { test: () => true, score: 20 },
  ]);
}
function scoreCgmTir(tir: number): number {
  return bandScore(tir, [
    { test: (v) => v >= 90, score: 95 },
    { test: (v) => v >= 70, score: 75 },
    { test: (v) => v >= 50, score: 45 },
    { test: () => true, score: 20 },
  ]);
}
function scoreWaist(waist: number, sex: Sex): number {
  if (sex === 'male') {
    return bandScore(waist, [
      { test: (v) => v < 94, score: 90 },
      { test: (v) => v < 102, score: 55 },
      { test: () => true, score: 25 },
    ]);
  }
  return bandScore(waist, [
    { test: (v) => v < 80, score: 90 },
    { test: (v) => v < 88, score: 55 },
    { test: () => true, score: 25 },
  ]);
}

export function computeEdadMetabolica(params: {
  glucose_mg_dl?: number;
  insulin_uU_ml?: number;
  hba1c_pct?: number;
  hdl_mg_dl?: number;
  triglycerides_mg_dl?: number;
  cgm_time_in_range_pct?: number;
  waist_cm?: number;
  sex: Sex;
  chronological_age: number;
}): SubEdadResult {
  const w = SUB_EDAD_METABOLICA_WEIGHTS;

  const homaValue =
    params.glucose_mg_dl != null && params.insulin_uU_ml != null
      ? (params.glucose_mg_dl * params.insulin_uU_ml) / 405
      : null;
  const trigsHdl =
    params.triglycerides_mg_dl != null && params.hdl_mg_dl != null && params.hdl_mg_dl > 0
      ? params.triglycerides_mg_dl / params.hdl_mg_dl
      : null;

  const components: Record<string, ComponentInput> = {
    homa_ir: { value: homaValue, score_0_100: homaValue != null ? scoreHomaIr(homaValue) : null, weight: w.homa_ir },
    hba1c: { value: params.hba1c_pct, score_0_100: params.hba1c_pct != null ? scoreHba1c(params.hba1c_pct) : null, weight: w.hba1c },
    trigs_hdl: { value: trigsHdl, score_0_100: trigsHdl != null ? scoreTrigsHdl(trigsHdl) : null, weight: w.trigs_hdl },
    cgm_tir: { value: params.cgm_time_in_range_pct, score_0_100: params.cgm_time_in_range_pct != null ? scoreCgmTir(params.cgm_time_in_range_pct) : null, weight: w.cgm_tir },
    cintura: { value: params.waist_cm, score_0_100: params.waist_cm != null ? scoreWaist(params.waist_cm, params.sex) : null, weight: w.cintura },
  };

  return buildSubEdadResult(components, params.chronological_age);
}
