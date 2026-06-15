/**
 * Capa 2 del parser v2 — conversión de unidades por biomarker.
 *
 * Convierte el valor extraído (en la unidad detectada en el PDF) a la unidad CANÓNICA
 * que espera el resto del pipeline (lab_results → lab_values → motor). Es la primera
 * defensa contra los absurdos de Mariana (ej. LDL en mmol/L leído como mg/dL).
 *
 * Orden de resolución en normalizeLabValue:
 *   1. conversión explícita si la unidad detectada está en el catálogo,
 *   2. heurística por magnitud (cuando no hay unidad o no cuadra),
 *   3. identity (asume que ya viene en canónica).
 *
 * NO inventa conversores: si una unidad no está, cae a heurística/identity y el método
 * resultante ('heuristic'/'identity') baja la confianza en la Capa 3.
 */
export type UnitConverter = (v: number) => number;

/** Unidad canónica objetivo por biomarker (la que espera el motor / lab_results). */
export const LAB_UNIT_CANONICAL: Record<string, string> = {
  testosterone: 'ng/dL',
  testosterone_free: 'pg/mL',
  estradiol: 'pg/mL',
  vitamin_d: 'ng/mL',
  vitamin_b12: 'pg/mL',
  cortisol: 'µg/dL',
  glucose: 'mg/dL',
  hba1c: '%',
  ldl: 'mg/dL',
  hdl: 'mg/dL',
  cholesterol_total: 'mg/dL',
  triglycerides: 'mg/dL',
  apob: 'mg/dL',
  creatinine: 'mg/dL',
  bun: 'mg/dL',
  urea: 'mg/dL',
  pcr: 'mg/dL',
  albumin: 'g/dL',
  wbc: '/µL',
  hematocrit: '%',
  homocysteine: 'µmol/L',
  ferritin: 'ng/mL',
  iron: 'µg/dL',
  tsh: 'µUI/mL',
};

export const LAB_UNIT_CONVERTERS: Record<string, Record<string, UnitConverter>> = {
  testosterone: {
    'ng/mL': (v) => v * 100,        // 9.93 ng/mL → 993 ng/dL
    'nmol/L': (v) => v * 28.84,     // 28.6 nmol/L → 825 ng/dL
    'ng/dL': (v) => v,
  },
  testosterone_free: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v * 0.2884,
  },
  estradiol: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v / 3.671,
  },
  vitamin_d: {
    'ng/mL': (v) => v,
    'nmol/L': (v) => v / 2.5,       // 75 nmol/L → 30 ng/mL
  },
  vitamin_b12: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v / 0.738,
  },
  cortisol: {
    'µg/dL': (v) => v,
    'ug/dL': (v) => v,
    'nmol/L': (v) => v / 27.59,
  },
  glucose: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 18,        // 5 mmol/L → 90 mg/dL
  },
  hba1c: {
    '%': (v) => v,
    'mmol/mol': (v) => (v / 10.93) + 2.15,  // NGSP-IFCC
    'decimal': (v) => v * 100,
  },
  ldl: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  hdl: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  cholesterol_total: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  triglycerides: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 88.5,
  },
  creatinine: {
    'mg/dL': (v) => v,
    'µmol/L': (v) => v / 88.4,
    'umol/L': (v) => v / 88.4,
  },
  bun: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 2.8,
  },
  urea: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v / 0.1665,
    'g/L': (v) => v * 100,
  },
  pcr: {
    'mg/dL': (v) => v,
    'mg/L': (v) => v / 10,          // 5 mg/L → 0.5 mg/dL
  },
  albumin: {
    'g/dL': (v) => v,
    'g/L': (v) => v / 10,
  },
  wbc: {
    '/µL': (v) => v,
    '/uL': (v) => v,
    '×10³/µL': (v) => v * 1000,
    '10^3/µL': (v) => v * 1000,
    'K/µL': (v) => v * 1000,
    '×10⁹/L': (v) => v * 1000,
  },
  hematocrit: {
    '%': (v) => v,
    'fracción': (v) => v * 100,
    'decimal': (v) => v * 100,       // 0.45 → 45%
  },
  ferritin: {
    'ng/mL': (v) => v,
    'µg/L': (v) => v,                // equivalentes
    'pmol/L': (v) => v / 2.247,
  },
};

export type NormalizeResult = {
  value: number;
  unitFrom: string;
  unitTo: string;
  method: 'explicit' | 'heuristic' | 'identity';
};

/** Normaliza una cadena de unidad para comparar (minúsculas, sin espacios). */
function cleanUnit(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Convierte un valor extraído a la unidad canónica del biomarker.
 * - Si la unidad detectada está en el catálogo → conversor explícito.
 * - Si NO → heurística por magnitud.
 * - Si nada cuadra → identity (asume canónica).
 */
export function normalizeLabValue(
  key: string,
  rawValue: number,
  detectedUnit?: string | null,
): NormalizeResult {
  const canonical = LAB_UNIT_CANONICAL[key];
  if (!canonical) {
    return { value: rawValue, unitFrom: detectedUnit ?? '?', unitTo: '?', method: 'identity' };
  }
  const converters = LAB_UNIT_CONVERTERS[key];

  // 1. Conversión explícita si la unidad detectada está en el catálogo.
  if (converters && detectedUnit) {
    const cleaned = cleanUnit(detectedUnit);
    for (const [unit, fn] of Object.entries(converters)) {
      if (cleaned === cleanUnit(unit)) {
        return { value: fn(rawValue), unitFrom: unit, unitTo: canonical, method: 'explicit' };
      }
    }
  }

  // 2. Heurística por magnitud (fallback).
  const heuristicResult = applyMagnitudeHeuristic(key, rawValue);
  if (heuristicResult) return heuristicResult;

  // 3. Identity (asume canónica).
  return { value: rawValue, unitFrom: detectedUnit ?? canonical, unitTo: canonical, method: 'identity' };
}

/** Heurística por magnitud para casos sin unidad detectada o no catalogada. */
function applyMagnitudeHeuristic(key: string, v: number): NormalizeResult | null {
  const canonical = LAB_UNIT_CANONICAL[key];
  if (!canonical) return null;

  switch (key) {
    case 'hba1c':
      if (v < 0.5) return { value: v * 100, unitFrom: 'decimal', unitTo: '%', method: 'heuristic' };
      break;
    case 'hematocrit':
      if (v < 1) return { value: v * 100, unitFrom: 'fracción', unitTo: '%', method: 'heuristic' };
      break;
    case 'wbc':
      if (v < 100) return { value: v * 1000, unitFrom: '×10³/µL', unitTo: '/µL', method: 'heuristic' };
      break;
    case 'glucose':
      if (v < 30) return { value: v * 18, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'ldl':
    case 'hdl':
    case 'cholesterol_total':
      if (v < 10) return { value: v * 38.67, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'triglycerides':
      if (v < 30) return { value: v * 88.5, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'testosterone':
      if (v < 20) return { value: v * 100, unitFrom: 'ng/mL', unitTo: 'ng/dL', method: 'heuristic' };
      break;
    case 'creatinine':
      if (v > 20) return { value: v / 88.4, unitFrom: 'µmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'pcr':
      if (v > 5) return { value: v / 10, unitFrom: 'mg/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
  }
  return null;
}
