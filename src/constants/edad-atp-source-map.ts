/**
 * Source map declarativo — cada parámetro de la matriz V7/V6 → su origen de datos.
 *
 * El TIPO de fuente ya viene en `MatrizParam.source` ("Laboratorio" | "Forms/Entrevista" |
 * "Tests" | "Calculo" | "Glucometro" | "Wearable"). Aquí se resuelve CÓMO leer cada uno:
 *  - lab        → lab_results (columna inglesa) → fallback lab_uploads.extracted_data
 *  - manual     → edad_atp_biomarkers (biomarker_key = clave de matriz)
 *  - questionnaire → edad_atp_questionnaire_responses (parameter_key = clave de matriz)
 *  - functional_test → edad_atp_functional_tests (test_key = clave de matriz)
 *  - computed   → derivado en runtime de otros params
 *  - wearable_or_manual → health_measurements (columna) → manual
 *
 * IMPORTANTE (unidades): la matriz usa las unidades del Excel; algunas columnas de la DB
 * difieren (hba1c %→decimal, hematocrito %→decimal). `convert` normaliza DB→unidad de matriz.
 */

export type ParamSource =
  | { source: 'lab'; columns: string[]; convert?: (v: number) => number }
  | { source: 'manual'; key: string }
  | { source: 'questionnaire'; param_key: string }
  | { source: 'functional_test'; test_key: string }
  | { source: 'computed'; deps: string[]; formula: (v: Record<string, number>) => number | undefined }
  | { source: 'wearable_or_manual'; columns: string[] }
  | { source: 'pending_capture' };

const pctToDecimal = (v: number) => (v > 1 ? v / 100 : v); // 5.9 → 0.059 ; 47.3 → 0.473

/** Params de Laboratorio: clave matriz → columna(s) lab_results (+ conversión si aplica). */
export const LAB_COLUMN_MAP: Record<string, { columns: string[]; convert?: (v: number) => number }> = {
  acido_urico: { columns: ['uric_acid'] },
  apolipoproteinas_b: { columns: ['apob', 'apolipoproteinas_b', 'apo_b'] },
  bilirrubina: { columns: ['bilirubin'] },
  capacidad_de_fijacion_de_hierro: { columns: ['iron_binding', 'tibc'] },
  cloro: { columns: ['chloride'] },
  colesterol_hdl: { columns: ['hdl'] },
  colesterol_ldl: { columns: ['ldl'] },
  colesterol_total: { columns: ['cholesterol_total'] },
  cortisol_matutino: { columns: ['cortisol'] },
  cpk: { columns: ['cpk'] },
  creatinina_serica: { columns: ['creatinine'] },
  factor_reumatoide: { columns: ['rheumatoid_factor'] },
  ferritina: { columns: ['ferritin'] },
  folato_acido_folico: { columns: ['folate'] },
  fsh: { columns: ['fsh'] },
  gama_glutamil_transferasa: { columns: ['ggt'] },
  ggt: { columns: ['ggt'] },
  glucosa_en_ayuno: { columns: ['glucose'] },
  hba1c: { columns: ['hba1c'], convert: pctToDecimal }, // DB 5.9% → matriz 0.059
  hematocrito: { columns: ['hematocrit'], convert: pctToDecimal }, // DB 47.3 → 0.473
  hemoglobina: { columns: ['hemoglobin'] },
  hierro_serico: { columns: ['iron'] },
  homair: { columns: ['homa_ir'] },
  homocisteina: { columns: ['homocysteine'] },
  iga: { columns: ['iga'] },
  ige: { columns: ['ige'] },
  igg: { columns: ['igg'] },
  igm: { columns: ['igm'] },
  insulina: { columns: ['insulin'] },
  leucocitos_totales: { columns: ['wbc'] },
  lh: { columns: ['lh'] },
  magnesio: { columns: ['magnesium'] },
  nitrogeno_ureico_bun: { columns: ['bun'] },
  potasio: { columns: ['potassium'] },
  proteina_c_reactiva_cuantitativa_pcr: { columns: ['pcr'] },
  prolactina: { columns: ['prolactin'] },
  rdw_cv: { columns: ['rdw'], convert: pctToDecimal },
  saturacion_de_hierro: { columns: ['iron_saturation'] },
  sodio: { columns: ['sodium'] },
  t3_libre: { columns: ['t3_free'] },
  testosterona_libre_pgml: { columns: ['testosterone_free', 'free_testosterone'] },
  testosterona_total: { columns: ['testosterone'] },
  transaminasa_glutamico_oxalacetica_ast: { columns: ['ast'] },
  transaminasa_g_oxalacetica_ast_tgo: { columns: ['ast'] },
  transaminasa_glutamico_piruvica_alt: { columns: ['alt'] },
  transferrina: { columns: ['transferrin'] },
  trigliceridos: { columns: ['triglycerides'] },
  tsh: { columns: ['tsh'] },
  urea: { columns: ['urea'] },
  vitamina_b12: { columns: ['vitamin_b12'] },
  vitamina_d: { columns: ['vitamin_d'] },
  vldl: { columns: ['vldl'] },
  antiestreptolisinas: { columns: ['aso'] },
  ldh: { columns: ['ldh'] },
  // Sin columna canónica en lab_results (vienen de extracted_data por clave o captura manual):
  // sdldl, indice_aterogenico, indice_de_bilirrubina, calciofosforo, de_agua_corporal,
  // hierro_libre, relacion_buncreatinina, anticuerpos_antitiroglobulina, anticuerpos_antitpo.
};

/** Params calculados en runtime (ratios). deps = claves de matriz. */
export const COMPUTED_PARAMS: Record<string, { deps: string[]; formula: (v: Record<string, number>) => number | undefined }> = {
  indice_de_lipoproteinas_ldlhdl: {
    deps: ['colesterol_ldl', 'colesterol_hdl'],
    formula: (v) => (v.colesterol_hdl ? v.colesterol_ldl / v.colesterol_hdl : undefined),
  },
  relacion_trigliceridos_hdl: {
    deps: ['trigliceridos', 'colesterol_hdl'],
    formula: (v) => (v.colesterol_hdl ? v.trigliceridos / v.colesterol_hdl : undefined),
  },
  relacion_neutrofilos_linfocitos_nlr: {
    deps: ['neutrofilos_totales', 'linfocitos_totales'],
    formula: (v) => (v.linfocitos_totales ? v.neutrofilos_totales / v.linfocitos_totales : undefined),
  },
};

/** Columnas de health_measurements para params Wearable. clave matriz → columna. */
export const WEARABLE_COLUMN_MAP: Record<string, string[]> = {
  frecuencia_cardiaca_en_reposo_sueno: ['resting_hr'],
  // sueno_deep, sueno_rem, eficiencia_del_sueno → pending integración wearable.
};

/**
 * Resuelve la fuente de un parámetro de matriz. El tipo base viene de `matrizSource`;
 * las claves Forms/Tests/Glucometro se leen de las tablas edad_atp_* por su MISMA clave.
 */
export function resolveParamSource(key: string, matrizSource: string | null): ParamSource {
  if (COMPUTED_PARAMS[key]) return { source: 'computed', ...COMPUTED_PARAMS[key] };
  if (LAB_COLUMN_MAP[key]) return { source: 'lab', ...LAB_COLUMN_MAP[key] };
  if (WEARABLE_COLUMN_MAP[key]) return { source: 'wearable_or_manual', columns: WEARABLE_COLUMN_MAP[key] };
  switch (matrizSource) {
    case 'Forms/Entrevista': return { source: 'questionnaire', param_key: key };
    case 'Tests': return { source: 'functional_test', test_key: key };
    case 'Glucometro': return { source: 'manual', key };
    case 'Wearable': return { source: 'wearable_or_manual', columns: [] };
    case 'Laboratorio': return { source: 'manual', key }; // lab sin columna → captura manual / extracted_data
    default: return { source: 'pending_capture' };
  }
}
