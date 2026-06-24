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
export type LabAbsoluteRange = {
  min: number;
  max: number;
  unit: string;
  /**
   * `clinical_only: true` = el parámetro NO tiene banda funcional definida en la matriz V7/V6.
   * La UI muestra el valor y si está dentro/fuera del rango clínico válido, pero NO una "banda
   * funcional óptima" (no existe) — sublabel "Rango clínico (pendiente rango funcional)".
   */
  clinical_only?: boolean;
};

export const LAB_ABSOLUTE_RANGES: Record<string, LabAbsoluteRange> = {
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
  t4_free: { min: 0.1, max: 5, unit: 'ng/dL', clinical_only: true },
  testosterone: { min: 5, max: 3000, unit: 'ng/dL' }, // total H (canónico ng/dL: rango clínico abs)
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
  platelets: { min: 20, max: 1000, unit: '×10³/µL', clinical_only: true },

  // Otros
  cpk: { min: 10, max: 5000, unit: 'U/L' },
  ldh: { min: 50, max: 2000, unit: 'U/L' },
  rheumatoid_factor: { min: 0, max: 500, unit: 'UI/mL' },

  // ─── Lote 1 (sprint 094) — CON banda funcional en matriz V7/V6 (NO clinical_only) ───
  // Decisión overnight (ver COWORK_REPORT §Parte 3): el rango ABSOLUTO es de PLAUSIBILIDAD
  // clínica (descartar basura del parser), NO la banda funcional óptima de la matriz. Usar la
  // banda de matriz como filtro absoluto descartaría valores reales elevados (anti-TPO en
  // Hashimoto llega a 100-1000+). La curva funcional sex-specific la aplica el motor de Edad ATP.
  anti_tpo: { min: 0, max: 5000, unit: 'UI/mL' },
  anti_tg: { min: 0, max: 5000, unit: 'UI/mL' },
  progesterone: { min: 0, max: 60, unit: 'ng/mL' },
  // calcium / phosphorus / neutrophils_pct / total_protein NO están en la matriz V7/V6
  // (solo existe el producto calcio*fósforo) → se tratan como clinical_only.
  calcium: { min: 4, max: 15, unit: 'mg/dL', clinical_only: true },
  phosphorus: { min: 0.5, max: 12, unit: 'mg/dL', clinical_only: true },
  neutrophils_pct: { min: 0, max: 100, unit: '%', clinical_only: true },
  total_protein: { min: 2, max: 12, unit: 'g/dL', clinical_only: true },

  // ─── Lote 2A (sprint 094) — clinical_only, ya reconocidos en lab-canonical-map (PhenoAge/L2) ───
  total_t3: { min: 30, max: 400, unit: 'ng/dL', clinical_only: true },
  total_t4: { min: 1, max: 25, unit: 'µg/dL', clinical_only: true },
  dhea: { min: 5, max: 1500, unit: 'µg/dL', clinical_only: true },
  shbg: { min: 5, max: 200, unit: 'nmol/L', clinical_only: true },
  igf1: { min: 30, max: 500, unit: 'ng/mL', clinical_only: true },
  non_hdl_cholesterol: { min: 30, max: 400, unit: 'mg/dL', clinical_only: true },
  lp_a: { min: 0, max: 200, unit: 'mg/dL', clinical_only: true },
  zinc: { min: 30, max: 200, unit: 'µg/dL', clinical_only: true },
  esr: { min: 0, max: 150, unit: 'mm/h', clinical_only: true },
  fibrinogen: { min: 50, max: 1000, unit: 'mg/dL', clinical_only: true },
  complement_c3: { min: 30, max: 200, unit: 'mg/dL', clinical_only: true },
  complement_c4: { min: 5, max: 80, unit: 'mg/dL', clinical_only: true },
  pt: { min: 8, max: 60, unit: 'seg', clinical_only: true },
  ptt: { min: 15, max: 200, unit: 'seg', clinical_only: true },
  inr: { min: 0.5, max: 10, unit: 'índice', clinical_only: true },
  bilirubin_direct: { min: 0, max: 15, unit: 'mg/dL', clinical_only: true },
  bilirubin_indirect: { min: 0, max: 20, unit: 'mg/dL', clinical_only: true },
  globulin: { min: 1, max: 6, unit: 'g/dL', clinical_only: true },
  co2: { min: 10, max: 40, unit: 'mEq/L', clinical_only: true },
  gfr: { min: 5, max: 200, unit: 'mL/min', clinical_only: true },
  rbc: { min: 2, max: 8, unit: 'M/µL', clinical_only: true },
  mch: { min: 15, max: 45, unit: 'pg', clinical_only: true },
  mchc: { min: 25, max: 40, unit: 'g/dL', clinical_only: true },
  mpv: { min: 5, max: 15, unit: 'fL', clinical_only: true },
  monocytes_pct: { min: 0, max: 25, unit: '%', clinical_only: true },
  eosinophils_pct: { min: 0, max: 30, unit: '%', clinical_only: true },
  basophils_pct: { min: 0, max: 10, unit: '%', clinical_only: true },
  fructosamine: { min: 100, max: 600, unit: 'µmol/L', clinical_only: true },
  c_peptide: { min: 0.1, max: 20, unit: 'ng/mL', clinical_only: true },

  // ─── Lote 2B (sprint 094) — clinical_only, NUEVOS (marcadores tumorales/autoinmunes/cardio/…) ───
  psa: { min: 0, max: 200, unit: 'ng/mL', clinical_only: true },
  ca_125: { min: 0, max: 1000, unit: 'U/mL', clinical_only: true },
  ca_19_9: { min: 0, max: 1000, unit: 'U/mL', clinical_only: true },
  ca_15_3: { min: 0, max: 500, unit: 'U/mL', clinical_only: true },
  cea: { min: 0, max: 100, unit: 'ng/mL', clinical_only: true },
  afp: { min: 0, max: 5000, unit: 'ng/mL', clinical_only: true },
  ana: { min: 0, max: 5120, unit: 'título', clinical_only: true },
  anti_dna: { min: 0, max: 500, unit: 'IU/mL', clinical_only: true },
  anti_ccp: { min: 0, max: 500, unit: 'U/mL', clinical_only: true },
  troponin_i: { min: 0, max: 50, unit: 'ng/mL', clinical_only: true },
  troponin_t: { min: 0, max: 10, unit: 'ng/mL', clinical_only: true },
  bnp: { min: 0, max: 5000, unit: 'pg/mL', clinical_only: true },
  nt_pro_bnp: { min: 0, max: 35000, unit: 'pg/mL', clinical_only: true },
  ck_mb: { min: 0, max: 300, unit: 'U/L', clinical_only: true },
  amh: { min: 0, max: 30, unit: 'ng/mL', clinical_only: true },
  inhibin_b: { min: 0, max: 500, unit: 'pg/mL', clinical_only: true },
  beta_hcg: { min: 0, max: 300000, unit: 'mIU/mL', clinical_only: true },
  pth: { min: 5, max: 1000, unit: 'pg/mL', clinical_only: true },
  calcitonin: { min: 0, max: 500, unit: 'pg/mL', clinical_only: true },
  vitamin_d_125: { min: 5, max: 200, unit: 'pg/mL', clinical_only: true },
  acth: { min: 0, max: 500, unit: 'pg/mL', clinical_only: true },
  aldosterone: { min: 1, max: 100, unit: 'ng/dL', clinical_only: true },
  renin_activity: { min: 0.1, max: 50, unit: 'ng/mL/h', clinical_only: true },
  growth_hormone: { min: 0, max: 50, unit: 'ng/mL', clinical_only: true },
  anti_hbs: { min: 0, max: 1000, unit: 'mIU/mL', clinical_only: true },
  hbsag: { min: 0, max: 10, unit: 'índice', clinical_only: true },
  anti_hcv: { min: 0, max: 10, unit: 'índice', clinical_only: true },
  hiv: { min: 0, max: 10, unit: 'índice', clinical_only: true },
  microalbumin: { min: 0, max: 1000, unit: 'mg/L', clinical_only: true },
  cystatin_c: { min: 0.1, max: 10, unit: 'mg/L', clinical_only: true },
  tibc: { min: 100, max: 600, unit: 'µg/dL', clinical_only: true }, // alias de iron_binding (ver canonical-map)
  d_dimer: { min: 0, max: 50, unit: 'µg/mL', clinical_only: true },
  procalcitonin: { min: 0, max: 500, unit: 'ng/mL', clinical_only: true },
  ammonia: { min: 5, max: 500, unit: 'µg/dL', clinical_only: true },
  lactate: { min: 0.3, max: 20, unit: 'mmol/L', clinical_only: true },
  reticulocyte_pct: { min: 0, max: 15, unit: '%', clinical_only: true },
  ige_total: { min: 0, max: 5000, unit: 'IU/mL', clinical_only: true }, // alias de ige (ver canonical-map)
};

/**
 * Mapa de la clave canónica (parameter_key de lab_values, p.ej. 'antigeno_prostatico_especifico')
 * a la clave inglesa del parser de LAB_ABSOLUTE_RANGES (p.ej. 'psa'). Solo se listan los casos
 * donde difieren; para el resto la clave canónica YA es la inglesa (t4_free, dhea, etc.). Permite
 * que la UI (que trabaja con parameter_key canónico) resuelva el flag clinical_only.
 */
const CANONICAL_TO_RANGE_KEY: Record<string, string> = {
  antigeno_prostatico_especifico: 'psa',
  alfa_fetoproteina: 'afp',
  anticuerpos_antinucleares: 'ana',
  troponina_i: 'troponin_i',
  troponina_t: 'troponin_t',
  hormona_antimulleriana: 'amh',
  inhibina_b: 'inhibin_b',
  parathormona: 'pth',
  calcitonina: 'calcitonin',
  vitamina_d_125_activa: 'vitamin_d_125',
  aldosterona: 'aldosterone',
  renina: 'renin_activity',
  hormona_crecimiento_gh: 'growth_hormone',
  microalbuminuria: 'microalbumin',
  cistatina_c: 'cystatin_c',
  capacidad_total_fijacion_hierro: 'tibc',
  dimero_d: 'd_dimer',
  procalcitonina: 'procalcitonin',
  amonio: 'ammonia',
  lactato: 'lactate',
  reticulocitos_pct: 'reticulocyte_pct',
};

/**
 * ¿Este parámetro es `clinical_only` (sin banda funcional)? Acepta tanto la clave inglesa del
 * parser como la clave canónica de lab_values. La UI lo usa para mostrar "Rango clínico
 * (pendiente rango funcional)" en vez de una banda óptima inexistente.
 */
export function isClinicalOnlyParam(key: string): boolean {
  const rangeKey = CANONICAL_TO_RANGE_KEY[key] ?? key;
  return LAB_ABSOLUTE_RANGES[rangeKey]?.clinical_only === true;
}

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
