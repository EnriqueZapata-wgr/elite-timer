/**
 * Sub-edad Fitness (display). EDAD ATP Sprint 1/N.
 * Pesos §4.4. Normas públicas: ACSM VO2max, EWGSOP2 grip, ACSM push-ups, FC.
 * // TODO Mariana Sprint 5: validate cutoffs (incl. push-up femenino, percentiles por edad).
 */
import type { Sex, SubEdadResult } from '@/src/types/edad-atp-v2';
import { SUB_EDAD_FITNESS_WEIGHTS } from '@/src/constants/edad-atp-v2-model';
import { buildSubEdadResult, bandScore, type ComponentInput } from './sub-edad-common';

function scoreVo2max(v: number): number {
  return bandScore(v, [
    { test: (x) => x >= 45, score: 95 },
    { test: (x) => x >= 38, score: 75 },
    { test: (x) => x >= 30, score: 50 },
    { test: (x) => x >= 25, score: 35 },
    { test: () => true, score: 20 },
  ]);
}
function scoreGrip(kg: number, sex: Sex): number {
  if (sex === 'male') {
    return bandScore(kg, [
      { test: (x) => x >= 45, score: 90 },
      { test: (x) => x >= 40, score: 70 },
      { test: (x) => x >= 27, score: 50 }, // EWGSOP2: <27 sarcopenia (hombres)
      { test: () => true, score: 20 },
    ]);
  }
  return bandScore(kg, [
    { test: (x) => x >= 30, score: 90 },
    { test: (x) => x >= 25, score: 65 },
    { test: (x) => x >= 16, score: 50 }, // EWGSOP2: <16 sarcopenia (mujeres)
    { test: () => true, score: 20 },
  ]);
}
function scorePushUps(n: number): number {
  return bandScore(n, [
    { test: (x) => x >= 30, score: 95 },
    { test: (x) => x >= 20, score: 75 },
    { test: (x) => x >= 10, score: 50 },
    { test: (x) => x >= 5, score: 35 },
    { test: () => true, score: 20 },
  ]);
}
function scoreRestingHr(bpm: number): number {
  return bandScore(bpm, [
    { test: (x) => x < 55, score: 95 },
    { test: (x) => x < 65, score: 75 },
    { test: (x) => x < 75, score: 50 },
    { test: (x) => x < 85, score: 35 },
    { test: () => true, score: 20 },
  ]);
}
function scoreRecoveryHr(drop: number): number {
  return bandScore(drop, [
    { test: (x) => x >= 25, score: 95 },
    { test: (x) => x >= 18, score: 70 },
    { test: (x) => x >= 12, score: 50 },
    { test: () => true, score: 25 },
  ]);
}

export function computeEdadFitness(params: {
  vo2max_ml_kg_min?: number;
  grip_strength_kg?: number;
  push_ups_max?: number;
  resting_hr_bpm?: number;
  recovery_hr_drop_bpm?: number;
  sex: Sex;
  chronological_age: number;
}): SubEdadResult {
  const w = SUB_EDAD_FITNESS_WEIGHTS;
  const components: Record<string, ComponentInput> = {
    vo2max: { value: params.vo2max_ml_kg_min, score_0_100: params.vo2max_ml_kg_min != null ? scoreVo2max(params.vo2max_ml_kg_min) : null, weight: w.vo2max },
    grip: { value: params.grip_strength_kg, score_0_100: params.grip_strength_kg != null ? scoreGrip(params.grip_strength_kg, params.sex) : null, weight: w.grip },
    push_ups: { value: params.push_ups_max, score_0_100: params.push_ups_max != null ? scorePushUps(params.push_ups_max) : null, weight: w.push_ups },
    resting_hr: { value: params.resting_hr_bpm, score_0_100: params.resting_hr_bpm != null ? scoreRestingHr(params.resting_hr_bpm) : null, weight: w.resting_hr },
    recovery_hr: { value: params.recovery_hr_drop_bpm, score_0_100: params.recovery_hr_drop_bpm != null ? scoreRecoveryHr(params.recovery_hr_drop_bpm) : null, weight: w.recovery_hr },
  };
  return buildSubEdadResult(components, params.chronological_age);
}
