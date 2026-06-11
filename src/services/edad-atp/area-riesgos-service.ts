/**
 * Motor v2 — ÁREA 5: RIESGOS DE PADECIMIENTOS (hoja `6_Area_Riesgos`).
 * 5 sub-bloques (cardio 0.30, metabólico 0.25, inflamatorio 0.20, hormonal 0.15,
 * hepato-renal 0.10). Cada sub-bloque pondera sus params; el score total mapea por la
 * curva universal score→edad. Hormonal y creatinina usan rangos sexo-específicos.
 *
 * Verificado contra los 4 fixtures: H1 42.0, H2 27.7, M1 22.0, M2 64.74.
 */
import { scoreToEdadCiega } from '@/src/constants/edad-atp-motor-v2-config';
import type { AreaCiegaResult, AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const SUBBLOQUE_WEIGHTS = { cardio: 0.3, metabolico: 0.25, inflamatorio: 0.2, hormonal: 0.15, hepatorenal: 0.1 };

type Band = { key: string; field: keyof MotorV2Input; weight: number; score: (v: number, male: boolean, input: MotorV2Input) => number };

const band4 = (v: number, t: [number, number, number, number], dir: 'le' | 'ge'): number => {
  // dir 'le': menor es mejor (score 100 si <= t[0]). 'ge': mayor es mejor.
  if (dir === 'le') return v <= t[0] ? 100 : v <= t[1] ? 80 : v <= t[2] ? 50 : v <= t[3] ? 25 : 0;
  return v >= t[0] ? 100 : v >= t[1] ? 80 : v >= t[2] ? 50 : v >= t[3] ? 25 : 0;
};

const CARDIO: Band[] = [
  { key: 'apob', field: 'apob', weight: 0.2, score: (v) => band4(v, [80, 99, 110, 125], 'le') },
  { key: 'ldl', field: 'ldl', weight: 0.1, score: (v) => band4(v, [100, 130, 160, 190], 'le') },
  { key: 'hdl', field: 'hdl', weight: 0.15, score: (v) => band4(v, [60, 50, 40, 30], 'ge') },
  { key: 'trigliceridos', field: 'triglycerides', weight: 0.1, score: (v) => band4(v, [100, 150, 200, 300], 'le') },
  { key: 'ratio_tg_hdl', field: 'triglycerides', weight: 0.15, score: (v, _m, i) => {
    const r = i.hdl ? v / i.hdl : Infinity;
    return r <= 2 ? 100 : r <= 3 ? 80 : r <= 4 ? 50 : r <= 6 ? 25 : 0;
  } },
  { key: 'pas', field: 'systolic_bp', weight: 0.15, score: (v) => (v >= 90 && v <= 115 ? 100 : v <= 120 ? 80 : v <= 130 ? 50 : v <= 140 ? 25 : 0) },
  { key: 'pad', field: 'diastolic_bp', weight: 0.1, score: (v) => (v >= 60 && v <= 75 ? 100 : v <= 85 ? 80 : v <= 90 ? 50 : v <= 100 ? 25 : 0) },
  { key: 'colesterol_total', field: 'total_cholesterol', weight: 0.05, score: (v) => band4(v, [200, 220, 240, 280], 'le') },
];

const METABOLICO: Band[] = [
  { key: 'hba1c', field: 'hba1c_pct', weight: 0.35, score: (v) => band4(v, [5.5, 5.6, 6.0, 6.5], 'le') },
  { key: 'homa_ir', field: 'homa_ir', weight: 0.3, score: (v) => band4(v, [1, 1.5, 2.5, 4], 'le') },
  { key: 'glucosa', field: 'glucose_mg_dl', weight: 0.2, score: (v) => band4(v, [90, 100, 110, 125], 'le') },
  { key: 'insulina', field: 'insulin', weight: 0.15, score: (v) => band4(v, [5, 8, 12, 20], 'le') },
];

const INFLAMATORIO: Band[] = [
  { key: 'pcr', field: 'crp_mg_dl', weight: 0.4, score: (v) => band4(v, [0.5, 1, 3, 10], 'le') },
  { key: 'homocisteina', field: 'homocysteine', weight: 0.3, score: (v) => band4(v, [8, 11, 13, 15], 'le') },
  { key: 'nlr', field: 'nlr', weight: 0.3, score: (v) => band4(v, [1.5, 2, 2.5, 3.5], 'le') },
];

const HORMONAL: Band[] = [
  { key: 'testo_estradiol', field: 'testo_or_estradiol', weight: 0.4, score: (v, male) => {
    if (male) {
      if (v >= 4 && v <= 8) return 100;
      if (v >= 3 && v < 4) return 80;
      if (v >= 8 && v <= 12) return 80;
      if (v < 3) return 25;
      return 50;
    }
    if (v >= 30 && v <= 200) return 100;
    if (v >= 200 && v <= 400) return 80;
    if (v < 30) return 25;
    return 50;
  } },
  { key: 'tsh', field: 'tsh', weight: 0.25, score: (v) => (v >= 1 && v <= 2.5 ? 100 : v >= 0.5 && v <= 3 ? 80 : v > 0.3 && v <= 4 ? 50 : v <= 5 ? 25 : 0) },
  { key: 'cortisol', field: 'cortisol', weight: 0.25, score: (v) => (v >= 6 && v <= 15 ? 100 : v <= 18 ? 80 : v <= 22 ? 50 : 25) },
  { key: 'vit_d', field: 'vit_d', weight: 0.1, score: (v) => (v >= 30 && v <= 70 ? 100 : v >= 20 ? 50 : 25) },
];

const HEPATORENAL: Band[] = [
  { key: 'ast', field: 'ast', weight: 0.2, score: (v) => band4(v, [25, 35, 45, 60], 'le') },
  { key: 'alt', field: 'alt', weight: 0.2, score: (v) => band4(v, [25, 35, 45, 60], 'le') },
  { key: 'ggt', field: 'ggt', weight: 0.2, score: (v) => band4(v, [25, 35, 50, 70], 'le') },
  { key: 'bun', field: 'bun', weight: 0.2, score: (v) => (v >= 8 && v <= 20 ? 100 : v <= 25 ? 80 : v <= 30 ? 50 : v <= 40 ? 25 : 0) },
  { key: 'creatinina', field: 'creatinine_mg_dl', weight: 0.2, score: (v, male) => {
    if (male) return v >= 0.6 && v <= 1.2 ? 100 : v <= 1.4 ? 80 : v <= 1.6 ? 50 : v <= 2 ? 25 : 0;
    return v >= 0.5 && v <= 1.1 ? 100 : v <= 1.3 ? 80 : v <= 1.5 ? 50 : v <= 1.8 ? 25 : 0;
  } },
];

function scoreSubbloque(bands: Band[], input: MotorV2Input, male: boolean, components: Record<string, AreaComponent>): { score: number; presentW: number; totalW: number } {
  let score = 0;
  let presentW = 0;
  let totalW = 0;
  for (const b of bands) {
    totalW += b.weight;
    const v = input[b.field] as number | undefined;
    const present = v != null;
    const s = present ? b.score(v as number, male, input) : null;
    if (present) { score += (s as number) * b.weight; presentW += b.weight; }
    components[b.key] = { value: present ? (v as number) : null, score_0_100: s, weight: b.weight };
  }
  return { score, presentW, totalW };
}

export function computeAreaRiesgos(input: MotorV2Input): AreaCiegaResult & { subbloques: Record<string, number> } {
  const male = input.sex === 'male';
  const components: Record<string, AreaComponent> = {};

  const c = scoreSubbloque(CARDIO, input, male, components);
  const m = scoreSubbloque(METABOLICO, input, male, components);
  const i = scoreSubbloque(INFLAMATORIO, input, male, components);
  const h = scoreSubbloque(HORMONAL, input, male, components);
  const hr = scoreSubbloque(HEPATORENAL, input, male, components);

  const subbloques = {
    cardio: c.score, metabolico: m.score, inflamatorio: i.score, hormonal: h.score, hepatorenal: hr.score,
  };

  const scoreTotal =
    c.score * SUBBLOQUE_WEIGHTS.cardio +
    m.score * SUBBLOQUE_WEIGHTS.metabolico +
    i.score * SUBBLOQUE_WEIGHTS.inflamatorio +
    h.score * SUBBLOQUE_WEIGHTS.hormonal +
    hr.score * SUBBLOQUE_WEIGHTS.hepatorenal;

  const presentW = c.presentW + m.presentW + i.presentW + h.presentW + hr.presentW;
  const totalW = c.totalW + m.totalW + i.totalW + h.totalW + hr.totalW;

  return {
    edad_ciega: scoreToEdadCiega(scoreTotal),
    score: scoreTotal,
    ce: totalW > 0 ? presentW / totalW : 0,
    components,
    subbloques,
  };
}
