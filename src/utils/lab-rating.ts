/**
 * Lab Rating — Evalúa valores de lab/composición/biomarcadores contra rangos funcionales.
 * Conecta lab_results columns con el motor de salud (functional-health-engine).
 */
import { DOMAINS, type Sex, type RatingLevel } from '../data/functional-health-engine';

export type Direction = 'above' | 'below' | 'in_range' | null;

export interface ValueRating {
  level: RatingLevel | 'no_data';
  direction: Direction;
  color: string;
  bgColor: string;
  label: string;
  arrow: string;
}

const RATING_CONFIG: Record<RatingLevel | 'no_data', { color: string; bgColor: string; label: string }> = {
  optimal:      { color: '#a8e02a', bgColor: 'rgba(168,224,42,0.12)',  label: 'Óptimo' },
  acceptable:   { color: '#EFD54F', bgColor: 'rgba(239,213,79,0.12)', label: 'Aceptable' },
  risk:         { color: '#EF9F27', bgColor: 'rgba(239,159,39,0.12)', label: 'Riesgo' },
  critical:     { color: '#E24B4A', bgColor: 'rgba(226,75,74,0.12)',  label: 'Crítico' },
  out_of_range: { color: '#E24B4A', bgColor: 'rgba(226,75,74,0.20)', label: 'Fuera de rango' },
  no_data:      { color: '#666',    bgColor: 'rgba(102,102,102,0.12)', label: 'Sin dato' },
};

// Mapeo: columna de lab_results → key(s) del motor de salud
const LAB_TO_ENGINE: Record<string, string[]> = {
  glucose: ['glucose_fasting'],
  hba1c: ['hba1c'],
  insulin: ['insulin'],
  homa_ir: ['homa_ir'],
  cholesterol_total: ['cholesterol_total'],
  hdl: ['hdl'],
  ldl: ['ldl'],
  triglycerides: ['triglycerides_cv', 'triglycerides'],
  vldl: ['vldl'],
  apo_b: ['apo_b'],
  tsh: ['tsh'],
  t3_free: ['t3_free'],
  t4_free: ['free_t4'],
  testosterone: ['testosterone_total'],
  testosterone_free: ['testosterone_free'],
  cortisol: ['cortisol_am'],
  fsh: ['fsh'],
  lh: ['lh'],
  prolactin: ['prolactin'],
  anti_tpo: ['anti_tpo'],
  anti_tg: ['anti_tg'],
  vitamin_d: ['vitamin_d', 'vitamin_d_r', 'vitamin_d_infl', 'vitamin_d_imm'],
  vitamin_b12: ['vitamin_b12', 'vitamin_b12_r'],
  iron: ['iron_serum'],
  ferritin: ['ferritin', 'ferritin_r'],
  magnesium: ['magnesium', 'magnesium_r'],
  folate: ['folate'],
  pcr: ['crp', 'crp_imm'],
  homocysteine: ['homocysteine'],
  rheumatoid_factor: ['rheumatoid_factor'],
  ldh: ['ldh', 'ldh_imm'],
  cpk: ['cpk'],
  aso: ['aso'],
  alt: ['alt'],
  ast: ['ast'],
  ggt: ['ggt', 'ggt_infl'],
  alp: ['alp'],
  albumin: ['albumin'],
  bilirubin: ['bilirubin', 'bilirubin_imm'],
  creatinine: ['creatinine'],
  uric_acid: ['uric_acid', 'uric_acid_r'],
  bun: ['bun'],
  urea: ['urea'],
  hemoglobin: ['hemoglobin'],
  hematocrit: ['hematocrit'],
  platelets: ['platelets'],
  wbc: ['wbc'],
  mcv: ['mcv'],
  rdw: ['rdw_cv'],
  lymphocyte_pct: ['lymphocyte_pct'],
  sodium: ['sodium'],
  potassium: ['potassium'],
  iron_binding: ['iron_binding'],
  iron_saturation: ['iron_saturation'],
  transferrin: ['transferrin'],
  free_iron: ['free_iron'],
  iga: ['iga'],
  ige: ['ige'],
  igg: ['igg'],
  esr: ['esr'],
};

// Composición corporal → key del motor
const BODY_TO_ENGINE: Record<string, string> = {
  body_fat_pct: 'body_fat_pct',
  muscle_mass_pct: 'muscle_pct_bc',
  visceral_fat: 'visceral_fat',
};

// Biomarcadores → key del motor
const BIO_TO_ENGINE: Record<string, string> = {
  grip_strength_kg: 'grip_strength_bc',
  vo2_max: 'vo2_max',
  blood_pressure_sys: 'systolic_bp',
  blood_pressure_dia: 'diastolic_bp',
};

// Cache de parámetros por key para no recorrer DOMAINS cada vez
const _paramCache = new Map<string, typeof DOMAINS[0]['parameters'][0]>();
function findParam(engineKey: string) {
  if (_paramCache.has(engineKey)) return _paramCache.get(engineKey)!;
  for (const d of DOMAINS) {
    for (const p of d.parameters) {
      if (p.key === engineKey) { _paramCache.set(engineKey, p); return p; }
    }
  }
  return null;
}

// Evaluar un valor contra un array de thresholds [t0..t7]
// Estructura: [t0 t1 t2 t3 t4 t5 t6 t7]
//   t[3]-t[4] = rango óptimo
//   t[0]-t[2] = umbrales por debajo (o por encima si invertido)
//   t[5]-t[7] = umbrales por encima (o por debajo si invertido)
function rateAgainstRanges(value: number, t: (number | null)[]): { level: RatingLevel; direction: Direction } {
  if (t[3] !== null && t[4] !== null) {
    if (t[3] <= t[4]) {
      // Rango normal: óptimo entre t[3] y t[4]
      if (value >= t[3] && value <= t[4]) return { level: 'optimal', direction: 'in_range' };
      if (value < t[3]) {
        if (t[2] !== null && value >= t[2]) return { level: 'acceptable', direction: 'below' };
        if (t[1] !== null && value >= t[1]) return { level: 'risk', direction: 'below' };
        if (t[0] !== null && value >= t[0]) return { level: 'critical', direction: 'below' };
        return { level: 'out_of_range', direction: 'below' };
      }
      // value > t[4]
      if (t[5] !== null && value <= t[5]) return { level: 'acceptable', direction: 'above' };
      if (t[6] !== null && value <= t[6]) return { level: 'risk', direction: 'above' };
      if (t[7] !== null && value <= t[7]) return { level: 'critical', direction: 'above' };
      return { level: 'out_of_range', direction: 'above' };
    }

    // t[3] > t[4] — Dos casos:
    const hasBidirectional = t[0] !== null || t[1] !== null || t[2] !== null;

    if (hasBidirectional) {
      // Rango bidireccional invertido (ej: grasa corporal, colesterol, visceral)
      // Óptimo entre t[4] (bajo) y t[3] (alto), umbrales invertidos:
      //   Arriba de t[3] → t[2] aceptable, t[1] riesgo, t[0] crítico
      //   Abajo de t[4] → t[5] aceptable, t[6] riesgo, t[7] crítico
      if (value >= t[4] && value <= t[3]) return { level: 'optimal', direction: 'in_range' };
      if (value > t[3]) {
        if (t[2] !== null && value <= t[2]) return { level: 'acceptable', direction: 'above' };
        if (t[1] !== null && value <= t[1]) return { level: 'risk', direction: 'above' };
        if (t[0] !== null && value <= t[0]) return { level: 'critical', direction: 'above' };
        return { level: 'out_of_range', direction: 'above' };
      }
      // value < t[4]
      if (t[5] !== null && value >= t[5]) return { level: 'acceptable', direction: 'below' };
      if (t[6] !== null && value >= t[6]) return { level: 'risk', direction: 'below' };
      if (t[7] !== null && value >= t[7]) return { level: 'critical', direction: 'below' };
      return { level: 'out_of_range', direction: 'below' };
    }

    // Higher is better (ej: HDL, hemoglobina) — t[0-2] son null
    if (value >= t[3]) return { level: 'optimal', direction: 'in_range' };
    if (value >= t[4]) return { level: 'acceptable', direction: 'below' };
    if (t[5] !== null && value >= t[5]) return { level: 'risk', direction: 'below' };
    if (t[6] !== null && value >= t[6]) return { level: 'critical', direction: 'below' };
    return { level: 'out_of_range', direction: 'below' };
  }
  // Lower is better: t[3] === null means only upper thresholds
  if (t[3] === null && t[4] !== null) {
    if (value <= t[4]) return { level: 'optimal', direction: 'in_range' };
    if (t[5] !== null && value <= t[5]) return { level: 'acceptable', direction: 'above' };
    if (t[6] !== null && value <= t[6]) return { level: 'risk', direction: 'above' };
    if (t[7] !== null && value <= t[7]) return { level: 'critical', direction: 'above' };
    return { level: 'out_of_range', direction: 'above' };
  }
  return { level: 'acceptable', direction: null };
}

function buildRating(level: RatingLevel | 'no_data', direction: Direction): ValueRating {
  const cfg = RATING_CONFIG[level];
  const arrow = direction === 'above' ? '↑' : direction === 'below' ? '↓' : direction === 'in_range' ? '✓' : '—';
  return { level, direction, ...cfg, arrow };
}

const NO_DATA = buildRating('no_data', null);

function rateWithEngineKeys(keys: string[], value: number, sex: Sex): ValueRating {
  for (const ek of keys) {
    const param = findParam(ek);
    if (param) {
      const ranges = sex === 'male' ? param.ranges.male : param.ranges.female;
      const { level, direction } = rateAgainstRanges(value, ranges);
      return buildRating(level, direction);
    }
  }
  return NO_DATA;
}

/** Evaluar un valor de lab_results */
export function rateLabValue(labColumn: string, value: number | null | undefined, sex: Sex = 'male'): ValueRating {
  if (value == null) return NO_DATA;
  const keys = LAB_TO_ENGINE[labColumn];
  if (!keys) return NO_DATA;
  return rateWithEngineKeys(keys, value, sex);
}

/** Evaluar composición corporal */
export function rateBodyValue(field: string, value: number | null | undefined, sex: Sex = 'male'): ValueRating {
  if (value == null) return NO_DATA;
  const engineKey = BODY_TO_ENGINE[field];
  if (!engineKey) return NO_DATA;
  return rateWithEngineKeys([engineKey], value, sex);
}

/** Evaluar biomarcador físico */
export function rateBioValue(field: string, value: number | null | undefined, sex: Sex = 'male'): ValueRating {
  if (value == null) return NO_DATA;
  const engineKey = BIO_TO_ENGINE[field];
  if (!engineKey) return NO_DATA;
  return rateWithEngineKeys([engineKey], value, sex);
}
