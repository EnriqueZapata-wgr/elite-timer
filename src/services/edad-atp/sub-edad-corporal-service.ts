/**
 * Sub-edad Corporal (display). EDAD ATP Sprint 1/N.
 * Pesos §4.2. Reusa los impactos del catálogo (body-composition-service) y los
 * mapea a score 0-100 (impacto 0 = neutral = 50; mejor = mayor score).
 * // TODO Mariana Sprint 5: validate cutoffs.
 */
import type { BodyComposition, Sex, SubEdadResult } from '@/src/types/edad-atp-v2';
import { SUB_EDAD_CORPORAL_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import { computeBodyCompositionAdjustments, computeFFMI } from './body-composition-service';
import { buildSubEdadResult, type ComponentInput } from './sub-edad-common';

/** Impacto en años (−3..+3) → score 0-100 (0 → 50 neutral; cada año desplaza 15 pts). */
function impactToScore(impactYears: number): number {
  return Math.max(0, Math.min(100, 50 - impactYears * 15));
}

export function computeEdadCorporal(params: {
  body_composition: BodyComposition;
  sex: Sex;
  chronological_age: number;
}): SubEdadResult {
  const { adjustments } = computeBodyCompositionAdjustments(params.body_composition, params.sex);
  const w = SUB_EDAD_CORPORAL_WEIGHTS;
  const ffmi = computeFFMI(params.body_composition);

  const components: Record<string, ComponentInput> = {
    ffmi: { value: ffmi, score_0_100: impactToScore(adjustments.ffmi), weight: w.ffmi },
    pct_grasa: { value: params.body_composition.body_fat_pct, score_0_100: impactToScore(adjustments.pct_grasa), weight: w.pct_grasa },
    pct_musculo: { value: params.body_composition.skeletal_muscle_pct, score_0_100: impactToScore(adjustments.pct_musculo), weight: w.pct_musculo },
    grasa_visceral: { value: params.body_composition.visceral_fat, score_0_100: impactToScore(adjustments.grasa_visceral), weight: w.grasa_visceral },
  };

  return buildSubEdadResult(components, params.chronological_age);
}
