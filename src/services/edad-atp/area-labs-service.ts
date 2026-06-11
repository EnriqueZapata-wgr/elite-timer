/**
 * Motor v2 — ÁREA 1: LABS CLÍNICOS (hoja `2_Area_Labs`).
 * PhenoAge (Levine 2018, reusa phenoage-service) + 7 modificadores funcionales como
 * delta sobre PhenoAge, con cap interno [-5, +10]. Edad LABS ciega = PhenoAge + Σdelta.
 *
 * Verificado contra los 4 fixtures (edad_labs_ciega ±1e-4): H1 39.897, H2 29.251,
 * M1 15.653, M2 73.488.
 */
import { computePhenoAge } from './phenoage-service';
import type { AreaCiegaResult, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

/** Defaults clínicos neutrales para biomarcadores PhenoAge faltantes (mismos que v1). */
const PHENOAGE_DEFAULTS = {
  albumin: 4.5, creatinine: 0.9, glucose: 90, crp: 0.2,
  lymphocyte_pct: 30, mcv: 90, rdw_cv: 13, alp: 70, wbc: 6000,
} as const;

/** Vit D: <30→+1, >70→+0.5, [50,70]→-1, [30,50)→0. (Orden del Excel: <30, >70, <50). */
function modVitD(v: number): number {
  if (v < 30) return 1;
  if (v > 70) return 0.5;
  if (v < 50) return 0;
  return -1;
}
/** Vit B12: <200→+2, <400→+0.5, <700→-0.5, ≥700→0. */
function modB12(v: number): number {
  if (v < 200) return 2;
  if (v < 400) return 0.5;
  if (v < 700) return -0.5;
  return 0;
}
/** Homocisteína: <8→-1, <12→0, <15→+1, ≥15→+2. */
function modHomocysteine(v: number): number {
  if (v < 8) return -1;
  if (v < 12) return 0;
  if (v < 15) return 1;
  return 2;
}
/** Ferritina: en rango [30,300]→-0.5, fuera→+1. */
function modFerritin(v: number): number {
  return v >= 30 && v <= 300 ? -0.5 : 1;
}
/** TSH: óptimo [1,2.5]→-0.5, (2.5,4]→0, fuera→+1. */
function modTSH(v: number): number {
  if (v >= 1 && v <= 2.5) return -0.5;
  if (v > 2.5 && v <= 4) return 0;
  return 1;
}
/** Cortisol: óptimo [8,15]→0, fuera→+1. */
function modCortisol(v: number): number {
  return v >= 8 && v <= 15 ? 0 : 1;
}
/** Bilirrubina: en rango [0.3,1.2]→-0.5 (antioxidante), fuera→+0.5. */
function modBilirubin(v: number): number {
  return v >= 0.3 && v <= 1.2 ? -0.5 : 0.5;
}

const MODIFIERS: Array<{ key: string; field: keyof MotorV2Input; fn: (v: number) => number }> = [
  { key: 'vit_d', field: 'vit_d', fn: modVitD },
  { key: 'vit_b12', field: 'vit_b12', fn: modB12 },
  { key: 'homocysteine', field: 'homocysteine', fn: modHomocysteine },
  { key: 'ferritin', field: 'ferritin', fn: modFerritin },
  { key: 'tsh', field: 'tsh', fn: modTSH },
  { key: 'cortisol', field: 'cortisol', fn: modCortisol },
  { key: 'bilirubin', field: 'bilirubin', fn: modBilirubin },
];

/** Las 9 claves PhenoAge requeridas para que el área tenga señal de Labs. */
const PHENO_FIELDS: Array<keyof MotorV2Input> = [
  'albumin_g_dl', 'creatinine_mg_dl', 'glucose_mg_dl', 'crp_mg_dl', 'lymphocyte_pct',
  'mcv_fl', 'rdw_cv_pct', 'alp_u_l', 'wbc_thousands_ul',
];

export function computeAreaLabs(input: MotorV2Input): AreaCiegaResult {
  const cron = input.chronological_age;
  const d = PHENOAGE_DEFAULTS;
  // PhenoAge: usa el valor del paciente; si falta, default clínico neutral (no rompe).
  const phenoage = computePhenoAge({
    albumin_g_dl: input.albumin_g_dl ?? d.albumin,
    creatinine_mg_dl: input.creatinine_mg_dl ?? d.creatinine,
    glucose_mg_dl: input.glucose_mg_dl ?? d.glucose,
    crp_mg_dl: input.crp_mg_dl ?? d.crp,
    lymphocyte_pct: input.lymphocyte_pct ?? d.lymphocyte_pct,
    mcv_fl: input.mcv_fl ?? d.mcv,
    rdw_cv_pct: input.rdw_cv_pct ?? d.rdw_cv,
    alp_u_l: input.alp_u_l ?? d.alp,
    wbc_per_ul: (input.wbc_thousands_ul ?? d.wbc / 1000) * 1000,
    chronological_age: cron,
  }).phenoage;

  const components: AreaCiegaResult['components'] = {};
  let presentWeight = 0;
  const totalWeight = PHENO_FIELDS.length + MODIFIERS.length;
  for (const f of PHENO_FIELDS) {
    const present = input[f] != null;
    if (present) presentWeight += 1;
    components[f as string] = { value: (input[f] as number) ?? null, score_0_100: null, weight: 1 };
  }

  let delta = 0;
  for (const m of MODIFIERS) {
    const v = input[m.field] as number | undefined;
    const present = v != null;
    const contrib = present ? m.fn(v as number) : 0;
    if (present) { delta += contrib; presentWeight += 1; }
    components[m.key] = { value: present ? (v as number) : null, score_0_100: present ? contrib : null, weight: 1 };
  }
  delta = Math.max(-5, Math.min(10, delta));

  return {
    edad_ciega: phenoage + delta,
    score: null, // Labs no mapea por curva universal; va directo de PhenoAge + delta
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    components,
  };
}
