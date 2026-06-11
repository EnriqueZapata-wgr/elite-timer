/**
 * Motor v2 — ÁREA 3: FITNESS / CAPACIDAD FÍSICA (hoja `4_Area_Fitness`).
 * 9 tests con bandas por sexo (ACSM, Yang 2019, Brito 2014, Berg, Leong 2015) → score
 * ponderado → curva universal score→edad.
 *
 * Verificado contra los 4 fixtures: H1 37.05, H2 22.0, M1 22.0, M2 92.92.
 */
import { scoreToEdadCiega } from '@/src/constants/edad-atp-motor-v2-config';
import type { AreaCiegaResult, AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const WEIGHTS = {
  vo2max: 0.25, agarre: 0.15, old_man_test: 0.15, push_ups: 0.1,
  sentadilla: 0.1, balance: 0.08, plank: 0.07, recovery_hr: 0.05, bolt: 0.05,
};

function scoreVO2(male: boolean, v: number): number {
  if (male) return v > 55 ? 100 : v >= 45 ? 80 : v >= 35 ? 50 : v >= 30 ? 25 : 0;
  return v > 45 ? 100 : v >= 38 ? 80 : v >= 30 ? 50 : v >= 25 ? 25 : 0;
}
function scoreAgarre(male: boolean, a: number): number {
  if (male) return a > 55 ? 100 : a >= 45 ? 80 : a >= 35 ? 50 : a >= 25 ? 25 : 0;
  return a > 35 ? 100 : a >= 28 ? 80 : a >= 22 ? 50 : a >= 18 ? 25 : 0;
}
function scoreOldMan(om: number): number {
  return om >= 10 ? 100 : om >= 8 ? 80 : om >= 6 ? 50 : om >= 4 ? 25 : 0;
}
function scorePushups(male: boolean, p: number): number {
  if (male) return p >= 40 ? 100 : p >= 25 ? 80 : p >= 15 ? 50 : p >= 10 ? 25 : 0;
  return p >= 25 ? 100 : p >= 15 ? 80 : p >= 8 ? 50 : p >= 5 ? 25 : 0;
}
function scoreSentadilla(male: boolean, s: number): number {
  if (male) return s >= 40 ? 100 : s >= 30 ? 80 : s >= 20 ? 50 : s >= 10 ? 25 : 0;
  return s >= 35 ? 100 : s >= 25 ? 80 : s >= 15 ? 50 : s >= 8 ? 25 : 0;
}
function scoreBalance(b: number): number {
  return b >= 60 ? 100 : b >= 30 ? 80 : b >= 15 ? 50 : b >= 5 ? 25 : 0;
}
function scorePlank(p: number): number {
  return p >= 180 ? 100 : p >= 90 ? 80 : p >= 45 ? 50 : p >= 20 ? 25 : 0;
}
function scoreRecoveryHR(r: number): number {
  return r >= 40 ? 100 : r >= 25 ? 80 : r >= 15 ? 50 : r >= 10 ? 25 : 0;
}
function scoreBOLT(b: number): number {
  return b >= 40 ? 100 : b >= 25 ? 80 : b >= 15 ? 50 : b >= 10 ? 25 : 0;
}

export function computeAreaFitness(input: MotorV2Input): AreaCiegaResult {
  const male = input.sex === 'male';
  const parts: Array<{ key: string; value: number | undefined; weight: number; score: number | null }> = [
    { key: 'vo2max', value: input.vo2max, weight: WEIGHTS.vo2max, score: input.vo2max != null ? scoreVO2(male, input.vo2max) : null },
    { key: 'agarre', value: input.grip_strength_kg, weight: WEIGHTS.agarre, score: input.grip_strength_kg != null ? scoreAgarre(male, input.grip_strength_kg) : null },
    { key: 'old_man_test', value: input.old_man_test, weight: WEIGHTS.old_man_test, score: input.old_man_test != null ? scoreOldMan(input.old_man_test) : null },
    { key: 'push_ups', value: input.push_ups, weight: WEIGHTS.push_ups, score: input.push_ups != null ? scorePushups(male, input.push_ups) : null },
    { key: 'sentadilla', value: input.squat_60s, weight: WEIGHTS.sentadilla, score: input.squat_60s != null ? scoreSentadilla(male, input.squat_60s) : null },
    { key: 'balance', value: input.balance_1leg_s, weight: WEIGHTS.balance, score: input.balance_1leg_s != null ? scoreBalance(input.balance_1leg_s) : null },
    { key: 'plank', value: input.plank_s, weight: WEIGHTS.plank, score: input.plank_s != null ? scorePlank(input.plank_s) : null },
    { key: 'recovery_hr', value: input.recovery_hr, weight: WEIGHTS.recovery_hr, score: input.recovery_hr != null ? scoreRecoveryHR(input.recovery_hr) : null },
    { key: 'bolt', value: input.bolt_s, weight: WEIGHTS.bolt, score: input.bolt_s != null ? scoreBOLT(input.bolt_s) : null },
  ];

  let scoreTotal = 0;
  let presentWeight = 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const components: Record<string, AreaComponent> = {};
  for (const p of parts) {
    if (p.score != null) { scoreTotal += p.score * p.weight; presentWeight += p.weight; }
    components[p.key] = { value: p.value ?? null, score_0_100: p.score, weight: p.weight };
  }

  // Doctrina CE: renormalizar por peso presente. Un param sin captura BAJA el CE,
  // NUNCA cuenta como score 0. Con datos completos presentWeight = 1.0 → gate intacto.
  // Área sin un solo dato → neutra: edad_ciega = cronológica (anclada queda = cron).
  const scoreNorm = presentWeight > 0 ? scoreTotal / presentWeight : 0;

  return {
    edad_ciega: presentWeight > 0 ? scoreToEdadCiega(scoreNorm) : input.chronological_age,
    score: scoreNorm,
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    components,
  };
}
