/**
 * Sub-edad Cardiovascular (display). EDAD ATP Sprint 1/N.
 * ASCVD Pooled Cohort Equations (AHA/ACC 2013) — coeficientes públicos.
 * Ref: Goff DC et al. 2013 ACC/AHA Guideline (Circulation 2014;129:S49-S73).
 * "Edad cardiovascular" = edad de una persona del mismo sexo/raza con perfil
 * óptimo cuyo riesgo a 10 años coincide con el del usuario (vascular age).
 * // TODO Mariana Sprint 5: validate / adaptar a población LATAM.
 */
import type { Sex, SubEdadResult } from '@/src/types/edad-atp-v2';

export type Race = 'white' | 'african_american' | 'other';

type CvInputs = {
  age: number;
  total_cholesterol_mg_dl: number;
  hdl_mg_dl: number;
  systolic_bp_mmHg: number;
  on_htn_treatment: boolean;
  has_diabetes: boolean;
  smoker: boolean;
};

const S0_MEAN = {
  white_male: { s0: 0.9144, mean: 61.18 },
  white_female: { s0: 0.9665, mean: -29.18 },
  african_american_male: { s0: 0.8954, mean: 19.54 },
  african_american_female: { s0: 0.9533, mean: 86.61 },
} as const;

function linearPredictor(group: keyof typeof S0_MEAN, x: CvInputs): number {
  const lnAge = Math.log(x.age);
  const lnTC = Math.log(x.total_cholesterol_mg_dl);
  const lnHDL = Math.log(x.hdl_mg_dl);
  const lnSBP = Math.log(x.systolic_bp_mmHg);
  const smoke = x.smoker ? 1 : 0;
  const dm = x.has_diabetes ? 1 : 0;
  const treated = x.on_htn_treatment;

  switch (group) {
    case 'white_male':
      return (
        12.344 * lnAge + 11.853 * lnTC - 2.664 * lnAge * lnTC - 7.990 * lnHDL + 1.769 * lnAge * lnHDL +
        (treated ? 1.797 : 1.764) * lnSBP + 7.837 * smoke - 1.795 * lnAge * smoke + 0.658 * dm
      );
    case 'white_female':
      return (
        -29.799 * lnAge + 4.884 * lnAge * lnAge + 13.540 * lnTC - 3.114 * lnAge * lnTC -
        13.578 * lnHDL + 3.149 * lnAge * lnHDL + (treated ? 2.019 : 1.957) * lnSBP +
        7.574 * smoke - 1.665 * lnAge * smoke + 0.661 * dm
      );
    case 'african_american_male':
      return (
        2.469 * lnAge + 0.302 * lnTC - 0.307 * lnHDL + (treated ? 1.916 : 1.809) * lnSBP +
        0.549 * smoke + 0.645 * dm
      );
    case 'african_american_female':
      return (
        17.114 * lnAge + 0.940 * lnTC - 18.920 * lnHDL + 4.475 * lnAge * lnHDL +
        (treated ? 29.291 * lnSBP - 6.432 * lnAge * lnSBP : 27.820 * lnSBP - 6.087 * lnAge * lnSBP) +
        0.691 * smoke + 0.874 * dm
      );
  }
}

function groupKey(sex: Sex, race: Race): keyof typeof S0_MEAN {
  const r = race === 'african_american' ? 'african_american' : 'white'; // 'other'/Latino → white
  return `${r}_${sex}` as keyof typeof S0_MEAN;
}

/** Riesgo ASCVD a 10 años (0-1). */
export function computeAscvdRisk(sex: Sex, race: Race, x: CvInputs): number {
  const group = groupKey(sex, race);
  const { s0, mean } = S0_MEAN[group];
  const risk = 1 - Math.pow(s0, Math.exp(linearPredictor(group, x) - mean));
  return Math.max(0, Math.min(1, risk));
}

const OPTIMAL_REFERENCE = {
  total_cholesterol_mg_dl: 170,
  hdl_mg_dl: 50,
  systolic_bp_mmHg: 110,
  on_htn_treatment: false,
  has_diabetes: false,
  smoker: false,
};

export function computeEdadCardiovascular(params: {
  chronological_age: number;
  sex: Sex;
  race: Race;
  total_cholesterol_mg_dl: number;
  hdl_mg_dl: number;
  systolic_bp_mmHg: number;
  on_htn_treatment: boolean;
  has_diabetes: boolean;
  smoker: boolean;
}): SubEdadResult {
  const userRisk = computeAscvdRisk(params.sex, params.race, {
    age: params.chronological_age,
    total_cholesterol_mg_dl: params.total_cholesterol_mg_dl,
    hdl_mg_dl: params.hdl_mg_dl,
    systolic_bp_mmHg: params.systolic_bp_mmHg,
    on_htn_treatment: params.on_htn_treatment,
    has_diabetes: params.has_diabetes,
    smoker: params.smoker,
  });

  // Vascular age: edad de un perfil óptimo (mismo sexo/raza) con el mismo riesgo.
  let vascularAge = params.chronological_age;
  let bestDiff = Infinity;
  for (let age = 30; age <= 90; age += 0.5) {
    const refRisk = computeAscvdRisk(params.sex, params.race, { age, ...OPTIMAL_REFERENCE });
    const diff = Math.abs(refRisk - userRisk);
    if (diff < bestDiff) {
      bestDiff = diff;
      vascularAge = age;
    }
  }

  return {
    age_years: vascularAge,
    ce_percent: 100, // todos los inputs ASCVD son requeridos
    components: {
      ascvd_risk_10y_pct: { value: userRisk * 100, score_0_100: (1 - userRisk) * 100, weight: 1, missing: false },
    },
  };
}
