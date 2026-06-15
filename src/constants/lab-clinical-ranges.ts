/**
 * Rangos clínicos ABSOLUTOS por biomarker (no fisiológicos, sino "valores posibles
 * en un humano vivo"). Si un valor extraído cae fuera → marcar como NO DETECTADO,
 * no insertar como dato del usuario.
 *
 * Doctrina del sprint (fix/lab-parser-validation): mejor `null` (pendiente) que un
 * número absurdo. Origen: Mariana subió labs por foto y el parser AI devolvió
 * LDL 2.27, HDL 2.15, Colesterol total 672 — clínicamente imposibles. El usuario
 * nunca debe ver basura como si fuera su dato.
 *
 * Fuente: rangos extremos documentados en literatura clínica (incluyen patologías
 * graves pero compatibles con vida). Más permisivos que rangos normales.
 *
 * IMPORTANTE — unidad de validación: estos rangos asumen el valor TAL COMO lo emite
 * el parser AI (mg/dL, %, U/L, etc.), ANTES de la conversión canónica a unidad de
 * matriz (hba1c %→decimal, hematocrito %→decimal). La validación corre en el borde
 * de extracción sobre los keys ingleses del parser. Ver COWORK_REPORT.md → flags de
 * ambigüedad de unidad (wbc en miles vs /µL, hematocrito decimal) pendientes de
 * validar con Mariana.
 */
export const LAB_ABSOLUTE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  // Lípidos
  ldl: { min: 30, max: 400, unit: 'mg/dL' },
  hdl: { min: 15, max: 150, unit: 'mg/dL' },
  cholesterol_total: { min: 80, max: 500, unit: 'mg/dL' },
  total_cholesterol: { min: 80, max: 500, unit: 'mg/dL' }, // alias key usado por la UI (biomarkers.tsx)
  triglycerides: { min: 30, max: 1500, unit: 'mg/dL' },
  apob: { min: 30, max: 300, unit: 'mg/dL' },
  apo_b: { min: 30, max: 300, unit: 'mg/dL' }, // alias: el parser AI emite apo_b
  vldl: { min: 5, max: 100, unit: 'mg/dL' },

  // Glucémicos
  glucose: { min: 30, max: 500, unit: 'mg/dL' },
  hba1c: { min: 3, max: 15, unit: '%' }, // decimal 0.03-0.15 si la app lo convierte
  insulin: { min: 0.5, max: 300, unit: 'µUI/mL' },
  homa_ir: { min: 0, max: 30, unit: 'índice' },

  // Inflamación
  pcr: { min: 0, max: 50, unit: 'mg/dL' },
  crp: { min: 0, max: 50, unit: 'mg/dL' }, // alias inglés de pcr
  homocysteine: { min: 3, max: 50, unit: 'µmol/L' },

  // Hormonales
  tsh: { min: 0.01, max: 100, unit: 'µUI/mL' },
  t3_free: { min: 0.5, max: 10, unit: 'pg/mL' },
  t4_free: { min: 0.1, max: 5, unit: 'ng/dL' },
  testosterone: { min: 0.5, max: 20, unit: 'ng/mL' }, // total H
  estradiol: { min: 5, max: 2000, unit: 'pg/mL' }, // perimenopáusico amplio
  cortisol: { min: 1, max: 100, unit: 'µg/dL' },

  // Vitaminas/minerales
  vitamin_d: { min: 5, max: 150, unit: 'ng/mL' },
  vitamin_b12: { min: 50, max: 2000, unit: 'pg/mL' },
  folate: { min: 1, max: 30, unit: 'ng/mL' },
  ferritin: { min: 1, max: 3000, unit: 'ng/mL' },
  iron: { min: 10, max: 400, unit: 'µg/dL' },

  // Renal
  creatinine: { min: 0.3, max: 15, unit: 'mg/dL' },
  bun: { min: 5, max: 200, unit: 'mg/dL' },
  urea: { min: 10, max: 400, unit: 'mg/dL' },
  uric_acid: { min: 1, max: 20, unit: 'mg/dL' },

  // Hepáticas
  ast: { min: 5, max: 1000, unit: 'U/L' },
  alt: { min: 5, max: 1000, unit: 'U/L' },
  ggt: { min: 5, max: 1000, unit: 'U/L' },
  alp: { min: 10, max: 1500, unit: 'U/L' },
  bilirubin: { min: 0.05, max: 30, unit: 'mg/dL' },
  albumin: { min: 1, max: 7, unit: 'g/dL' },

  // Hematológicos
  hemoglobin: { min: 5, max: 25, unit: 'g/dL' },
  hematocrit: { min: 15, max: 70, unit: '%' }, // si llega decimal 0.15-0.70, validar ambos
  wbc: { min: 500, max: 50000, unit: '/µL' }, // ojo: a veces viene en miles
  mcv: { min: 50, max: 150, unit: 'fL' },
  rdw: { min: 8, max: 40, unit: '%' },
  lymphocyte_pct: { min: 5, max: 90, unit: '%' },
  platelets: { min: 20, max: 1000, unit: '×10³/µL' },

  // Otros
  cpk: { min: 10, max: 5000, unit: 'U/L' },
  ldh: { min: 50, max: 2000, unit: 'U/L' },
  rheumatoid_factor: { min: 0, max: 500, unit: 'UI/mL' },
};

/**
 * Valida un valor extraído contra el rango absoluto del biomarker.
 * @returns true si el valor es plausible, false si es imposible (descartar).
 */
export function isLabValueValid(key: string, value: number | null | undefined): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  const range = LAB_ABSOLUTE_RANGES[key];
  if (!range) return true; // si no hay rango definido, aceptar (TODO Mariana validar)
  return value >= range.min && value <= range.max;
}
