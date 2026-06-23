/**
 * Mapa canónico de laboratorios — UNA fuente de verdad para la time-series `lab_values`.
 *
 * Antes había 3 fuentes paralelas de labs (lab_results ancha, lab_uploads.extracted_data,
 * edad_atp_biomarkers) leídas con `limit(1)` y prioridad POR FUENTE → un panel parcial
 * nuevo borraba datos de paneles anteriores (glucosa/tiroides desaparecían). La migración
 * 072 unifica todo en `lab_values` (narrow time-series, un valor por fila con fecha+fuente).
 *
 * Este módulo define el ÚNICO mapeo english-column → `parameter_key` canónico, usado por:
 *   - el backfill SQL (072) — mismo mapa, replicado como tabla en el .sql,
 *   - la escritura en vivo (extracción de PDF, captura manual) → `insertLabValues`,
 *   - la lectura (`loadCanonicalLabValues`) y el bridge a PhenoAge (`loadUserData`).
 *
 * `parameter_key` canónico = clave de la matriz V7/V6 (español) cuando existe. Los
 * biomarcadores que SOLO usa PhenoAge y NO son parámetros de matriz (albumin, mcv, alp,
 * lymphocyte_pct) conservan su nombre inglés como clave canónica — documentado como
 * desviación intencional en COWORK_REPORT.md.
 *
 * Unidades: la conversión DB→matriz (hba1c %→decimal, hematocrito %→decimal, rdw %→decimal)
 * se aplica UNA sola vez, en el borde de ESCRITURA a `lab_values` (regla del handoff #1.2).
 * La lectura ya no convierte nada.
 */

/** Días tras los cuales un valor se considera "viejo" (flag + baja CE, nunca se descarta). */
export const STALE_DAYS = 365;

/** Conversión %→fracción decimal, condicional (idempotente si ya viene en decimal). */
export const pctToDecimal = (v: number): number => (v > 1 ? v / 100 : v);

/** Inversa: fracción decimal→%, condicional (idempotente si ya viene en %). */
export const decimalToPct = (v: number): number => (v <= 1 ? v * 100 : v);

/**
 * Claves canónicas que `lab_values` guarda en fracción decimal (unidad de matriz) y que por
 * tanto requieren pctToDecimal al escribir desde una captura/origen en %. Una sola lista.
 */
export const CANONICAL_PCT_KEYS = new Set<string>(['hba1c', 'hematocrito', 'rdw_cv']);

/** Convierte el valor de una clave canónica a unidad de matriz (decimal) si aplica. */
export function toCanonicalUnit(parameterKey: string, value: number): number {
  return CANONICAL_PCT_KEYS.has(parameterKey) ? pctToDecimal(value) : value;
}

/**
 * Mapa english-column (de lab_results / extracted_data) → claves canónicas de `lab_values`.
 * `keys`: una o más (algunos params de matriz comparten columna: ggt y AST tienen dos
 * claves cada uno). `convertPct`: aplicar pctToDecimal al escribir.
 *
 * IMPORTANTE: derivado de LAB_COLUMN_MAP (edad-atp-source-map). Las columnas listadas aquí
 * son las que EXISTEN realmente en lab_results (migraciones 007/017/020). Donde el source-map
 * tenía alias que NO son columnas reales (apob, apo_b) se usa la columna real de lab_results.
 */
export const LAB_COLUMN_TO_CANONICAL: Record<string, { keys: string[]; convertPct?: boolean }> = {
  // --- Metabólico / lípidos ---
  glucose: { keys: ['glucosa_en_ayuno'] },
  hba1c: { keys: ['hba1c'], convertPct: true },
  insulin: { keys: ['insulina'] },
  homa_ir: { keys: ['homair'] },
  cholesterol_total: { keys: ['colesterol_total'] },
  hdl: { keys: ['colesterol_hdl'] },
  ldl: { keys: ['colesterol_ldl'] },
  triglycerides: { keys: ['trigliceridos'] },
  vldl: { keys: ['vldl'] },
  apo_b: { keys: ['apolipoproteinas_b'] },
  // --- Hormonal ---
  tsh: { keys: ['tsh'] },
  t3_free: { keys: ['t3_libre'] },
  testosterone: { keys: ['testosterona_total'] },
  testosterone_free: { keys: ['testosterona_libre_pgml'] },
  cortisol: { keys: ['cortisol_matutino'] },
  fsh: { keys: ['fsh'] },
  lh: { keys: ['lh'] },
  prolactin: { keys: ['prolactina'] },
  // --- Micronutrientes / hierro ---
  vitamin_d: { keys: ['vitamina_d'] },
  vitamin_b12: { keys: ['vitamina_b12'] },
  iron: { keys: ['hierro_serico'] },
  ferritin: { keys: ['ferritina'] },
  magnesium: { keys: ['magnesio'] },
  folate: { keys: ['folato_acido_folico'] },
  iron_binding: { keys: ['capacidad_de_fijacion_de_hierro'] },
  iron_saturation: { keys: ['saturacion_de_hierro'] },
  transferrin: { keys: ['transferrina'] },
  // --- Inflamación / inmunidad ---
  pcr: { keys: ['proteina_c_reactiva_cuantitativa_pcr'] },
  homocysteine: { keys: ['homocisteina'] },
  rheumatoid_factor: { keys: ['factor_reumatoide'] },
  aso: { keys: ['antiestreptolisinas'] },
  ldh: { keys: ['ldh'] },
  cpk: { keys: ['cpk'] },
  iga: { keys: ['iga'] },
  ige: { keys: ['ige'] },
  igg: { keys: ['igg'] },
  igm: { keys: ['igm'] },
  // --- Hepático ---
  alt: { keys: ['transaminasa_glutamico_piruvica_alt'] },
  ast: { keys: ['transaminasa_glutamico_oxalacetica_ast', 'transaminasa_g_oxalacetica_ast_tgo'] },
  ggt: { keys: ['gama_glutamil_transferasa', 'ggt'] },
  bilirubin: { keys: ['bilirrubina'] },
  // --- Renal / electrolitos ---
  creatinine: { keys: ['creatinina_serica'] },
  uric_acid: { keys: ['acido_urico'] },
  bun: { keys: ['nitrogeno_ureico_bun'] },
  urea: { keys: ['urea'] },
  sodium: { keys: ['sodio'] },
  potassium: { keys: ['potasio'] },
  chloride: { keys: ['cloro'] },
  // --- Biometría hemática ---
  hemoglobin: { keys: ['hemoglobina'] },
  hematocrit: { keys: ['hematocrito'], convertPct: true },
  rdw: { keys: ['rdw_cv'], convertPct: true },
  wbc: { keys: ['leucocitos_totales'] },
  // --- PhenoAge-only (sin clave de matriz; conservan nombre inglés) ---
  albumin: { keys: ['albumin'] },
  mcv: { keys: ['mcv'] },
  alp: { keys: ['alp'] },
  lymphocyte_pct: { keys: ['lymphocyte_pct'] },

  // --- L2 (audit 19-jun): biomarcadores que el parser SÍ extrae pero que antes se DROPEABAN
  // por no tener mapeo → ahora persisten a lab_values (graficables). Clave canónica = nombre
  // inglés (graph-only, no alimentan matriz salvo que ya tengan key arriba). Ver
  // cowork_handoff/AUDIT_LABS_BIOMARKERS.md. Los _pct se guardan como % (igual que lymphocyte_pct).
  // Tiroides extendida:
  t4_free: { keys: ['t4_free'] },
  total_t3: { keys: ['total_t3'] },
  total_t4: { keys: ['total_t4'] },
  anti_tpo: { keys: ['anti_tpo'] },
  anti_tg: { keys: ['anti_tg'] },
  // Hormonal extendida:
  estradiol: { keys: ['estradiol'] },
  progesterone: { keys: ['progesterone'] },
  dhea: { keys: ['dhea'] },
  shbg: { keys: ['shbg'] },
  igf1: { keys: ['igf1'] },
  // Lípidos extendidos:
  non_hdl_cholesterol: { keys: ['non_hdl_cholesterol'] },
  lp_a: { keys: ['lp_a'] },
  // Minerales:
  calcium: { keys: ['calcium'] },
  phosphorus: { keys: ['phosphorus'] },
  zinc: { keys: ['zinc'] },
  // Inflamación / coagulación:
  esr: { keys: ['esr'] },
  fibrinogen: { keys: ['fibrinogen'] },
  complement_c3: { keys: ['complement_c3'] },
  complement_c4: { keys: ['complement_c4'] },
  pt: { keys: ['pt'] },
  ptt: { keys: ['ptt'] },
  inr: { keys: ['inr'] },
  // Hepático / proteínas:
  bilirubin_direct: { keys: ['bilirubin_direct'] },
  bilirubin_indirect: { keys: ['bilirubin_indirect'] },
  total_protein: { keys: ['total_protein'] },
  globulin: { keys: ['globulin'] },
  ag_ratio: { keys: ['ag_ratio'] },
  // Renal / electrolitos:
  co2: { keys: ['co2'] },
  gfr: { keys: ['gfr'] },
  // Biometría hemática extendida:
  platelets: { keys: ['platelets'] },
  rbc: { keys: ['rbc'] },
  mch: { keys: ['mch'] },
  mchc: { keys: ['mchc'] },
  mpv: { keys: ['mpv'] },
  neutrophils_pct: { keys: ['neutrophils_pct'] },
  monocytes_pct: { keys: ['monocytes_pct'] },
  eosinophils_pct: { keys: ['eosinophils_pct'] },
  basophils_pct: { keys: ['basophils_pct'] },
  // Metabólico extendido:
  fructosamine: { keys: ['fructosamine'] },
  c_peptide: { keys: ['c_peptide'] },

  // --- Lote 2B (sprint 094): catálogo extendido clinical_only (marcadores tumorales,
  // autoinmunes, cardio, fertilidad, paratiroides, endocrino, virales, renal, otros).
  // Clave inglesa (parser) → parameter_key canónico (español cuando aplica). graph-only.
  // NOTA: `tibc` e `ige_total` NO se agregan aquí — son el MISMO biomarcador que iron_binding
  // e ige ya existentes; se resuelven vía EXTRACTED_KEY_ALIASES para no duplicar (ver abajo).
  // Marcadores tumorales:
  psa: { keys: ['antigeno_prostatico_especifico'] },
  ca_125: { keys: ['ca_125'] },
  ca_19_9: { keys: ['ca_19_9'] },
  ca_15_3: { keys: ['ca_15_3'] },
  cea: { keys: ['cea'] },
  afp: { keys: ['alfa_fetoproteina'] },
  // Autoinmunes:
  ana: { keys: ['anticuerpos_antinucleares'] },
  anti_dna: { keys: ['anti_dna'] },
  anti_ccp: { keys: ['anti_ccp'] },
  // Cardio biomarcadores:
  troponin_i: { keys: ['troponina_i'] },
  troponin_t: { keys: ['troponina_t'] },
  bnp: { keys: ['bnp'] },
  nt_pro_bnp: { keys: ['nt_pro_bnp'] },
  ck_mb: { keys: ['ck_mb'] },
  // Fertilidad:
  amh: { keys: ['hormona_antimulleriana'] },
  inhibin_b: { keys: ['inhibina_b'] },
  beta_hcg: { keys: ['beta_hcg'] },
  // Paratiroides:
  pth: { keys: ['parathormona'] },
  calcitonin: { keys: ['calcitonina'] },
  vitamin_d_125: { keys: ['vitamina_d_125_activa'] },
  // Endocrino:
  acth: { keys: ['acth'] },
  aldosterone: { keys: ['aldosterona'] },
  renin_activity: { keys: ['renina'] },
  growth_hormone: { keys: ['hormona_crecimiento_gh'] },
  // Virales / hepatitis:
  anti_hbs: { keys: ['anti_hbs'] },
  hbsag: { keys: ['hbsag'] },
  anti_hcv: { keys: ['anti_hcv'] },
  hiv: { keys: ['hiv'] },
  // Renal:
  microalbumin: { keys: ['microalbuminuria'] },
  cystatin_c: { keys: ['cistatina_c'] },
  // Otros:
  d_dimer: { keys: ['dimero_d'] },
  procalcitonin: { keys: ['procalcitonina'] },
  ammonia: { keys: ['amonio'] },
  lactate: { keys: ['lactato'] },
  reticulocyte_pct: { keys: ['reticulocitos_pct'] },
};

/**
 * Sinónimos de claves de extracted_data (parser AI) → english column canónica de arriba.
 * El parser a veces emite español o variantes; normalizamos antes de mapear.
 */
export const EXTRACTED_KEY_ALIASES: Record<string, string> = {
  glucosa: 'glucose',
  creatinina: 'creatinine',
  albumina: 'albumin',
  serum_albumin: 'albumin',
  crp: 'pcr',
  proteina_c_reactiva: 'pcr',
  vcm: 'mcv',
  rdw_cv: 'rdw',
  fosfatasa_alcalina: 'alp',
  leucocitos: 'wbc',
  linfocitos_pct: 'lymphocyte_pct',
  lymphocytes_pct: 'lymphocyte_pct',
  free_testosterone: 'testosterone_free',
  // --- Lote 2B (sprint 094): el parser a veces emite el nombre español → normalizar a la
  // columna inglesa de LAB_COLUMN_TO_CANONICAL. (Los que ya son ingleses, ca_125/cea/etc., no
  // necesitan alias.)
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
  dimero_d: 'd_dimer',
  procalcitonina: 'procalcitonin',
  amonio: 'ammonia',
  lactato: 'lactate',
  reticulocitos_pct: 'reticulocyte_pct',
  // Conflictos resueltos (mismo biomarcador que uno existente → NO duplicar canónico):
  tibc: 'iron_binding',
  capacidad_total_fijacion_hierro: 'iron_binding',
  ige_total: 'ige',
};

/** Resuelve una key cruda (de extracted_data) a su english column canónica, si la hay. */
export function normalizeExtractedKey(rawKey: string): string {
  return EXTRACTED_KEY_ALIASES[rawKey] ?? rawKey;
}

/**
 * Mapea un dict de valores crudos {englishOrSpanishKey: number} a entradas canónicas
 * {parameter_key, value} ya convertidas. Usado por la escritura en vivo (extracción/captura).
 * Expande las claves múltiples (ggt → 2 filas) y aplica la conversión de unidad UNA vez.
 */
export function toCanonicalEntries(
  raw: Record<string, number>,
): Array<{ parameter_key: string; value: number }> {
  const out: Array<{ parameter_key: string; value: number }> = [];
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    if (typeof rawVal !== 'number' || !Number.isFinite(rawVal)) continue;
    const col = normalizeExtractedKey(rawKey);
    const m = LAB_COLUMN_TO_CANONICAL[col];
    if (!m) continue; // sin mapeo canónico → no se escribe a lab_values (flag, no se adivina)
    const value = m.convertPct ? pctToDecimal(rawVal) : rawVal;
    for (const parameter_key of m.keys) out.push({ parameter_key, value });
  }
  return out;
}

/**
 * Bridge PhenoAge: campo de UnifiedUserData → parameter_key canónico en `lab_values`.
 * loadUserData lo usa para leer los biomarcadores PhenoAge/metabólicos desde la fuente única.
 *
 * `pctOut`: `lab_values` guarda este parámetro en fracción decimal (unidad de matriz), pero
 * los consumidores PhenoAge/riesgos lo esperan en % (ej. hba1c_pct >= 6.5, RDW de Levine ~13).
 * Se invierte la conversión SOLO en este bridge — el store sigue en una sola unidad.
 */
export const PHENOAGE_FIELD_TO_CANONICAL: Record<string, { key: string; pctOut?: boolean }> = {
  albumin_g_dl: { key: 'albumin' },
  creatinine_mg_dl: { key: 'creatinina_serica' },
  glucose_mg_dl: { key: 'glucosa_en_ayuno' },
  pcr_mg_dl: { key: 'proteina_c_reactiva_cuantitativa_pcr' },
  lymphocyte_pct: { key: 'lymphocyte_pct' },
  mcv_fl: { key: 'mcv' },
  rdw_cv_pct: { key: 'rdw_cv', pctOut: true },
  alp_u_l: { key: 'alp' },
  wbc_per_ul: { key: 'leucocitos_totales' },
  insulin_uU_ml: { key: 'insulina' },
  hba1c_pct: { key: 'hba1c', pctOut: true },
  hdl_mg_dl: { key: 'colesterol_hdl' },
  triglycerides_mg_dl: { key: 'trigliceridos' },
  total_cholesterol_mg_dl: { key: 'colesterol_total' },
  ldl_mg_dl: { key: 'colesterol_ldl' },
};
