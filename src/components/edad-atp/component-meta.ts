/**
 * component-meta — metadatos UI por componente del motor v2 (label ES, unidad y
 * DESTINO DE CAPTURA). Doctrina 3 del sprint captura unificada: "el drill-down ES
 * la captura" — donde ves un dato, lo editas inline (params manuales) o un tap te
 * lleva DIRECTO a su formulario. Cero navegación a pantallas hermanas confusas.
 *
 * Tipos de captura:
 *  - hm: editable INLINE → columna de health_measurements (modal numérico simple).
 *  - subjetivos: editable INLINE → edad_atp_questionnaire_responses (3 valores 1-7,
 *    domain propio 'cognicion_subjetivos' para no pisar otros cuestionarios).
 *  - route: deep-link directo al formulario que captura ese param.
 *  - derived: calculado (FFMI, ratio TG/HDL) — el tap lleva al formulario de sus bases.
 */
import type { SubEdadKey } from '@/src/types/edad-atp-v2';
import type { HealthMeasurementInput } from '@/src/services/edad-atp/capture-service';

export type ComponentCapture =
  | { type: 'hm'; field: keyof HealthMeasurementInput }
  | { type: 'subjetivos' }
  | { type: 'route'; route: string };

export type ComponentMeta = {
  label: string;
  unit?: string;
  capture: ComponentCapture;
  /** Para inputs inline: redondear a entero al guardar. */
  integer?: boolean;
};

/**
 * Display de un PARÁMETRO DE LAB por su `parameter_key` canónico (clave de matriz español,
 * o inglés para los PhenoAge-only). FUENTE ÚNICA de nomenclatura para labs (#2) y de la
 * descripción del long-press (#3). Toda pantalla de labs lee de aquí — cero strings sueltos.
 */
export type LabParamMeta = {
  /** Nombre clínico completo, capitalización y acentos correctos. */
  display_name: string;
  /** Sigla/abreviatura estándar (HDL, HbA1c, GGT…). */
  abbr: string;
  unit?: string;
  /** 1-2 frases en lenguaje llano: qué es y por qué importa (NO diagnostica). */
  description: string;
};

const BIOMARKERS = { type: 'route', route: '/edad-atp/biomarkers' } as const;
const TESTS_FORM = { type: 'route', route: '/edad-atp/tests/balance' } as const;
const COMPOSITION = { type: 'route', route: '/edad-atp/composition' } as const;
const REACTION = { type: 'route', route: '/edad-atp/tests/reaction-time' } as const;

export const COMPONENT_META: Record<SubEdadKey, Record<string, ComponentMeta>> = {
  labs: {
    albumin_g_dl: { label: 'Albúmina', unit: 'g/dL', capture: BIOMARKERS },
    creatinine_mg_dl: { label: 'Creatinina', unit: 'mg/dL', capture: BIOMARKERS },
    glucose_mg_dl: { label: 'Glucosa', unit: 'mg/dL', capture: BIOMARKERS },
    crp_mg_dl: { label: 'PCR', unit: 'mg/dL', capture: BIOMARKERS },
    lymphocyte_pct: { label: 'Linfocitos', unit: '%', capture: BIOMARKERS },
    mcv_fl: { label: 'VCM', unit: 'fL', capture: BIOMARKERS },
    rdw_cv_pct: { label: 'RDW-CV', unit: '%', capture: BIOMARKERS },
    alp_u_l: { label: 'Fosfatasa alcalina', unit: 'U/L', capture: BIOMARKERS },
    wbc_thousands_ul: { label: 'Leucocitos', unit: '10³/µL', capture: BIOMARKERS },
    vit_d: { label: 'Vitamina D', unit: 'ng/mL', capture: BIOMARKERS },
    vit_b12: { label: 'Vitamina B12', unit: 'pg/mL', capture: BIOMARKERS },
    homocysteine: { label: 'Homocisteína', unit: 'µmol/L', capture: BIOMARKERS },
    ferritin: { label: 'Ferritina', unit: 'ng/mL', capture: BIOMARKERS },
    tsh: { label: 'TSH', unit: 'µUI/mL', capture: BIOMARKERS },
    cortisol: { label: 'Cortisol matutino', unit: 'µg/dL', capture: BIOMARKERS },
    bilirubin: { label: 'Bilirrubina', unit: 'mg/dL', capture: BIOMARKERS },
  },
  composicion: {
    grasa: { label: '% Grasa corporal', unit: '%', capture: { type: 'hm', field: 'body_fat_pct' } },
    ffmi: { label: 'FFMI', capture: COMPOSITION }, // derivado de peso/altura/grasa
    musculo: { label: '% Músculo', unit: '%', capture: COMPOSITION }, // se captura como kg en el form
    visceral: { label: 'Grasa visceral', capture: { type: 'hm', field: 'visceral_fat' }, integer: true },
    agarre: { label: 'Fuerza de agarre', unit: 'kg', capture: { type: 'hm', field: 'grip_strength_kg' } },
    cintura: { label: 'Cintura', unit: 'cm', capture: { type: 'hm', field: 'waist_cm' } },
  },
  fitness: {
    vo2max: { label: 'VO2max', unit: 'ml/kg/min', capture: { type: 'route', route: '/edad-atp/tests/cooper' } },
    agarre: { label: 'Fuerza de agarre', unit: 'kg', capture: { type: 'hm', field: 'grip_strength_kg' } },
    old_man_test: { label: 'Old Man Test', unit: 'pts', capture: TESTS_FORM },
    push_ups: { label: 'Push-ups máximas', unit: 'reps', capture: { type: 'route', route: '/edad-atp/tests/push-ups' } },
    sentadilla: { label: 'Sentadilla 60s', unit: 'reps', capture: TESTS_FORM },
    balance: { label: 'Balance 1 pie', unit: 's', capture: TESTS_FORM },
    plank: { label: 'Plank', unit: 's', capture: TESTS_FORM },
    recovery_hr: { label: 'Recovery HR 1 min', unit: 'lpm', capture: TESTS_FORM },
    bolt: { label: 'BOLT', unit: 's', capture: TESTS_FORM },
  },
  cognicion: {
    rt_simple: { label: 'Reacción simple', unit: 'ms', capture: REACTION },
    rt_choice: { label: 'Reacción de elección', unit: 'ms', capture: REACTION },
    go_no_go: { label: 'Go / No-Go', unit: 'ms', capture: REACTION },
    subjetivos: { label: 'Subjetivos (claridad·energía·memoria)', unit: '/10', capture: { type: 'subjetivos' } },
  },
  riesgos: {
    apob: { label: 'ApoB', unit: 'mg/dL', capture: BIOMARKERS },
    ldl: { label: 'Colesterol LDL', unit: 'mg/dL', capture: BIOMARKERS },
    hdl: { label: 'Colesterol HDL', unit: 'mg/dL', capture: BIOMARKERS },
    trigliceridos: { label: 'Triglicéridos', unit: 'mg/dL', capture: BIOMARKERS },
    ratio_tg_hdl: { label: 'Ratio TG/HDL', capture: BIOMARKERS }, // derivado tg/hdl
    pas: { label: 'Presión sistólica', unit: 'mmHg', capture: { type: 'hm', field: 'systolic_bp' }, integer: true },
    pad: { label: 'Presión diastólica', unit: 'mmHg', capture: { type: 'hm', field: 'diastolic_bp' }, integer: true },
    colesterol_total: { label: 'Colesterol total', unit: 'mg/dL', capture: BIOMARKERS },
    hba1c: { label: 'HbA1c', unit: '%', capture: BIOMARKERS },
    homa_ir: { label: 'HOMA-IR', capture: BIOMARKERS },
    glucosa: { label: 'Glucosa', unit: 'mg/dL', capture: BIOMARKERS },
    insulina: { label: 'Insulina', unit: 'µU/mL', capture: BIOMARKERS },
    pcr: { label: 'PCR', unit: 'mg/dL', capture: BIOMARKERS },
    homocisteina: { label: 'Homocisteína', unit: 'µmol/L', capture: BIOMARKERS },
    nlr: { label: 'NLR', capture: BIOMARKERS },
    testo_estradiol: { label: 'Testosterona / Estradiol', capture: BIOMARKERS },
    tsh: { label: 'TSH', unit: 'µUI/mL', capture: BIOMARKERS },
    cortisol: { label: 'Cortisol matutino', unit: 'µg/dL', capture: BIOMARKERS },
    vit_d: { label: 'Vitamina D', unit: 'ng/mL', capture: BIOMARKERS },
    ast: { label: 'AST', unit: 'U/L', capture: BIOMARKERS },
    alt: { label: 'ALT', unit: 'U/L', capture: BIOMARKERS },
    ggt: { label: 'GGT', unit: 'U/L', capture: BIOMARKERS },
    bun: { label: 'BUN', unit: 'mg/dL', capture: BIOMARKERS },
    creatinina: { label: 'Creatinina', unit: 'mg/dL', capture: BIOMARKERS },
  },
};

/** Meta de un componente; fallback humanizado para keys no mapeadas. */
export function getComponentMeta(area: SubEdadKey, key: string): ComponentMeta {
  const m = COMPONENT_META[area]?.[key];
  if (m) return m;
  return { label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), capture: BIOMARKERS };
}

/**
 * Nomenclatura + descripción por `parameter_key` canónico de `lab_values`. Las claves español
 * son las de la matriz V7/V6; las inglesas (albumin/mcv/alp/lymphocyte_pct) son los PhenoAge-only
 * sin clave de matriz (ver lab-canonical-map.ts §5).
 */
export const LAB_PARAM_META: Record<string, LabParamMeta> = {
  // — Metabólico / glucosa —
  glucosa_en_ayuno: { display_name: 'Glucosa en ayuno', abbr: 'Glucosa', unit: 'mg/dL', description: 'Azúcar en sangre tras ayuno. Refleja cómo manejas la energía; valores altos sostenidos estresan el metabolismo.' },
  hba1c: { display_name: 'Hemoglobina glicosilada', abbr: 'HbA1c', unit: '%', description: 'Promedio de glucosa de los últimos ~3 meses. Una foto de tu control metabólico a mediano plazo.' },
  insulina: { display_name: 'Insulina', abbr: 'Insulina', unit: 'µU/mL', description: 'Hormona que mete la glucosa a las células. Si está alta, el cuerpo está trabajando de más para mantener el azúcar a raya.' },
  homair: { display_name: 'Índice HOMA-IR', abbr: 'HOMA-IR', description: 'Estima resistencia a la insulina combinando glucosa e insulina. Más bajo = mejor sensibilidad.' },
  // — Lípidos —
  colesterol_total: { display_name: 'Colesterol total', abbr: 'Col. total', unit: 'mg/dL', description: 'Suma de las fracciones de colesterol. Por sí solo dice poco; importa el reparto entre HDL, LDL y triglicéridos.' },
  colesterol_hdl: { display_name: 'Colesterol HDL', abbr: 'HDL', unit: 'mg/dL', description: 'El colesterol "que limpia": ayuda a retirar grasa de las arterias. Más alto suele ser protector.' },
  colesterol_ldl: { display_name: 'Colesterol LDL', abbr: 'LDL', unit: 'mg/dL', description: 'El colesterol que puede depositarse en las arterias. Conviene mantenerlo en rango funcional, no solo "normal".' },
  trigliceridos: { display_name: 'Triglicéridos', abbr: 'TG', unit: 'mg/dL', description: 'Grasa de transporte en sangre. Suben con exceso de azúcar/alcohol; marcador clave de salud metabólica.' },
  vldl: { display_name: 'Colesterol VLDL', abbr: 'VLDL', unit: 'mg/dL', description: 'Lipoproteína que transporta triglicéridos. Se mueve junto con ellos.' },
  apolipoproteinas_b: { display_name: 'Apolipoproteína B', abbr: 'ApoB', unit: 'mg/dL', description: 'Cuenta las partículas que pueden tapar arterias. Predice riesgo cardiovascular mejor que el LDL solo.' },
  // — Tiroides / hormonal —
  tsh: { display_name: 'Hormona estimulante de tiroides', abbr: 'TSH', unit: 'µUI/mL', description: 'La señal del cerebro a la tiroides. Marca si la tiroides va lenta o acelerada.' },
  t3_libre: { display_name: 'Triyodotironina libre', abbr: 'T3 libre', unit: 'pg/mL', description: 'La hormona tiroidea activa disponible. Influye en energía, temperatura y metabolismo.' },
  testosterona_total: { display_name: 'Testosterona total', abbr: 'Testo. total', unit: 'ng/dL', description: 'Hormona clave de fuerza, libido y recuperación. Cae con edad, estrés y mal sueño.' },
  testosterona_libre_pgml: { display_name: 'Testosterona libre', abbr: 'Testo. libre', unit: 'pg/mL', description: 'La testosterona biológicamente disponible (no unida a proteínas). Más representativa de lo que el cuerpo usa.' },
  cortisol_matutino: { display_name: 'Cortisol matutino', abbr: 'Cortisol', unit: 'µg/dL', description: 'Hormona del estrés y del despertar. Su pico matutino debe ser claro; alterado habla de estrés crónico.' },
  fsh: { display_name: 'Hormona folículo-estimulante', abbr: 'FSH', unit: 'mUI/mL', description: 'Hormona reproductiva. Útil para evaluar eje hormonal y fertilidad.' },
  lh: { display_name: 'Hormona luteinizante', abbr: 'LH', unit: 'mUI/mL', description: 'Hormona reproductiva que regula la producción de hormonas sexuales.' },
  prolactina: { display_name: 'Prolactina', abbr: 'Prolactina', unit: 'ng/mL', description: 'Hormona que, elevada fuera de embarazo/lactancia, puede frenar otras hormonas sexuales.' },
  // — Micronutrientes / hierro —
  vitamina_d: { display_name: 'Vitamina D (25-OH)', abbr: 'Vit. D', unit: 'ng/mL', description: 'Más una hormona que una vitamina: afecta hueso, inmunidad y ánimo. Muy común tenerla baja.' },
  vitamina_b12: { display_name: 'Vitamina B12', abbr: 'Vit. B12', unit: 'pg/mL', description: 'Clave para energía, nervios y formación de sangre. Su déficit cansa y afecta la concentración.' },
  hierro_serico: { display_name: 'Hierro sérico', abbr: 'Hierro', unit: 'µg/dL', description: 'Hierro circulante. Se interpreta junto con ferritina y transferrina, no solo.' },
  ferritina: { display_name: 'Ferritina', abbr: 'Ferritina', unit: 'ng/mL', description: 'Reserva de hierro del cuerpo. Baja = poca reserva; muy alta puede indicar inflamación.' },
  magnesio: { display_name: 'Magnesio', abbr: 'Mg', unit: 'mg/dL', description: 'Mineral de cientos de reacciones (músculo, sueño, energía). El sérico subestima el déficit real.' },
  folato_acido_folico: { display_name: 'Ácido fólico (folato)', abbr: 'Folato', unit: 'ng/mL', description: 'Vitamina B9, esencial para formar sangre y para el metabolismo de la homocisteína.' },
  capacidad_de_fijacion_de_hierro: { display_name: 'Capacidad de fijación de hierro', abbr: 'TIBC', unit: 'µg/dL', description: 'Cuánto hierro puede transportar la sangre. Sube cuando las reservas están bajas.' },
  saturacion_de_hierro: { display_name: 'Saturación de transferrina', abbr: 'Sat. hierro', unit: '%', description: 'Qué tan "llena" de hierro va la transferrina. Ayuda a distinguir déficit de sobrecarga.' },
  transferrina: { display_name: 'Transferrina', abbr: 'Transferrina', unit: 'mg/dL', description: 'La proteína que transporta el hierro por la sangre.' },
  // — Inflamación / inmunidad —
  proteina_c_reactiva_cuantitativa_pcr: { display_name: 'Proteína C reactiva (hs-CRP)', abbr: 'PCR', unit: 'mg/L', description: 'Marcador de inflamación de bajo grado. Elevada de forma crónica se asocia a riesgo cardiometabólico.' },
  homocisteina: { display_name: 'Homocisteína', abbr: 'Homocisteína', unit: 'µmol/L', description: 'Aminoácido que, alto, daña vasos y se liga a déficit de B12/folato. Marcador funcional importante.' },
  factor_reumatoide: { display_name: 'Factor reumatoide', abbr: 'FR', unit: 'UI/mL', description: 'Anticuerpo que se evalúa en contexto de inflamación articular.' },
  antiestreptolisinas: { display_name: 'Antiestreptolisinas O', abbr: 'ASO', unit: 'UI/mL', description: 'Marca contacto reciente con cierta bacteria (estreptococo). De contexto, no rutina.' },
  ldh: { display_name: 'Lactato deshidrogenasa', abbr: 'LDH', unit: 'U/L', description: 'Enzima presente en muchos tejidos; inespecífica, se lee en conjunto.' },
  cpk: { display_name: 'Creatina fosfocinasa', abbr: 'CPK', unit: 'U/L', description: 'Enzima del músculo. Sube tras ejercicio intenso o daño muscular.' },
  iga: { display_name: 'Inmunoglobulina A', abbr: 'IgA', unit: 'mg/dL', description: 'Anticuerpo de mucosas (intestino, vías respiratorias). Parte del perfil inmune.' },
  ige: { display_name: 'Inmunoglobulina E', abbr: 'IgE', unit: 'UI/mL', description: 'Anticuerpo ligado a alergias y parásitos.' },
  igg: { display_name: 'Inmunoglobulina G', abbr: 'IgG', unit: 'mg/dL', description: 'El anticuerpo de memoria inmune más abundante.' },
  igm: { display_name: 'Inmunoglobulina M', abbr: 'IgM', unit: 'mg/dL', description: 'El primer anticuerpo que aparece ante una infección nueva.' },
  // — Hepático —
  transaminasa_glutamico_piruvica_alt: { display_name: 'Alanina aminotransferasa', abbr: 'ALT (TGP)', unit: 'U/L', description: 'Enzima hepática. Elevada habla de estrés del hígado (grasa, alcohol, fármacos).' },
  transaminasa_glutamico_oxalacetica_ast: { display_name: 'Aspartato aminotransferasa', abbr: 'AST (TGO)', unit: 'U/L', description: 'Enzima de hígado y músculo. Se interpreta junto a ALT.' },
  transaminasa_g_oxalacetica_ast_tgo: { display_name: 'Aspartato aminotransferasa', abbr: 'AST (TGO)', unit: 'U/L', description: 'Enzima de hígado y músculo. Se interpreta junto a ALT.' },
  gama_glutamil_transferasa: { display_name: 'Gamma-glutamil transferasa', abbr: 'GGT', unit: 'U/L', description: 'Enzima sensible a alcohol y estrés hepático. Marcador funcional fino del hígado.' },
  ggt: { display_name: 'Gamma-glutamil transferasa', abbr: 'GGT', unit: 'U/L', description: 'Enzima sensible a alcohol y estrés hepático. Marcador funcional fino del hígado.' },
  bilirrubina: { display_name: 'Bilirrubina total', abbr: 'Bilirrubina', unit: 'mg/dL', description: 'Producto del reciclaje de glóbulos rojos. Se procesa en el hígado.' },
  // — Renal / electrolitos —
  creatinina_serica: { display_name: 'Creatinina sérica', abbr: 'Creatinina', unit: 'mg/dL', description: 'Desecho muscular que filtran los riñones. Estima qué tan bien filtran.' },
  acido_urico: { display_name: 'Ácido úrico', abbr: 'Ác. úrico', unit: 'mg/dL', description: 'Producto del metabolismo de purinas. Alto se liga a gota y a salud metabólica.' },
  nitrogeno_ureico_bun: { display_name: 'Nitrógeno ureico en sangre', abbr: 'BUN', unit: 'mg/dL', description: 'Desecho del metabolismo de proteínas. Refleja función renal e hidratación.' },
  urea: { display_name: 'Urea', abbr: 'Urea', unit: 'mg/dL', description: 'Desecho nitrogenado filtrado por el riñón. Va de la mano del BUN.' },
  sodio: { display_name: 'Sodio', abbr: 'Na', unit: 'mEq/L', description: 'Electrolito clave del equilibrio de líquidos y la presión.' },
  potasio: { display_name: 'Potasio', abbr: 'K', unit: 'mEq/L', description: 'Electrolito esencial para corazón y músculo. Se mantiene en rango estrecho.' },
  cloro: { display_name: 'Cloro', abbr: 'Cl', unit: 'mEq/L', description: 'Electrolito que acompaña al sodio en el equilibrio ácido-base.' },
  // — Biometría hemática —
  hemoglobina: { display_name: 'Hemoglobina', abbr: 'Hb', unit: 'g/dL', description: 'Proteína que lleva oxígeno en los glóbulos rojos. Baja = anemia; alta = sangre concentrada.' },
  hematocrito: { display_name: 'Hematocrito', abbr: 'Hto', unit: '%', description: 'Porcentaje de la sangre ocupado por glóbulos rojos. Acompaña a la hemoglobina.' },
  rdw_cv: { display_name: 'Ancho de distribución eritrocitaria', abbr: 'RDW-CV', unit: '%', description: 'Qué tan parejos son de tamaño tus glóbulos rojos. Elevado es un marcador funcional de salud general.' },
  leucocitos_totales: { display_name: 'Leucocitos totales', abbr: 'Leucocitos', unit: '/µL', description: 'Glóbulos blancos: tu defensa. Muy altos o muy bajos hablan de infección o estrés inmune.' },
  // — PhenoAge-only (clave inglesa, sin param de matriz) —
  albumin: { display_name: 'Albúmina', abbr: 'Albúmina', unit: 'g/dL', description: 'Principal proteína de la sangre. Refleja nutrición, hígado e inflamación; pesa en tu edad biológica.' },
  mcv: { display_name: 'Volumen corpuscular medio', abbr: 'VCM', unit: 'fL', description: 'Tamaño promedio de tus glóbulos rojos. Orienta el tipo de anemia si la hay.' },
  alp: { display_name: 'Fosfatasa alcalina', abbr: 'FA', unit: 'U/L', description: 'Enzima de hígado y hueso. Marcador que entra en el cálculo de edad biológica.' },
  lymphocyte_pct: { display_name: 'Linfocitos', abbr: 'Linfocitos', unit: '%', description: 'Glóbulos blancos de la inmunidad específica. Su proporción es señal de estado inmune y envejecimiento.' },
};

/**
 * Bridge: clave de componente del motor (por área) → parameter_key canónico de lab_values.
 * Permite que el long-press del drill-down resuelva la descripción desde LAB_PARAM_META.
 * Solo las áreas con labs (labs, riesgos). Las claves derivadas/no-lab (ratio_tg_hdl, pas,
 * pad, nlr, testo_estradiol) no se mapean → caen al fallback del popup.
 */
export const COMPONENT_TO_PARAM_KEY: Partial<Record<SubEdadKey, Record<string, string>>> = {
  labs: {
    albumin_g_dl: 'albumin', creatinine_mg_dl: 'creatinina_serica', glucose_mg_dl: 'glucosa_en_ayuno',
    crp_mg_dl: 'proteina_c_reactiva_cuantitativa_pcr', lymphocyte_pct: 'lymphocyte_pct', mcv_fl: 'mcv',
    rdw_cv_pct: 'rdw_cv', alp_u_l: 'alp', wbc_thousands_ul: 'leucocitos_totales', vit_d: 'vitamina_d',
    vit_b12: 'vitamina_b12', homocysteine: 'homocisteina', ferritin: 'ferritina', tsh: 'tsh',
    cortisol: 'cortisol_matutino', bilirubin: 'bilirrubina',
  },
  riesgos: {
    apob: 'apolipoproteinas_b', ldl: 'colesterol_ldl', hdl: 'colesterol_hdl', trigliceridos: 'trigliceridos',
    colesterol_total: 'colesterol_total', hba1c: 'hba1c', homa_ir: 'homair', glucosa: 'glucosa_en_ayuno',
    insulina: 'insulina', pcr: 'proteina_c_reactiva_cuantitativa_pcr', homocisteina: 'homocisteina',
    tsh: 'tsh', cortisol: 'cortisol_matutino', vit_d: 'vitamina_d', ast: 'transaminasa_glutamico_oxalacetica_ast',
    alt: 'transaminasa_glutamico_piruvica_alt', ggt: 'ggt', bun: 'nitrogeno_ureico_bun', creatinina: 'creatinina_serica',
  },
};

/** parameter_key canónico para una clave de componente del motor (o null si no aplica). */
export function componentToParamKey(area: SubEdadKey, componentKey: string): string | null {
  return COMPONENT_TO_PARAM_KEY[area]?.[componentKey] ?? null;
}

/** Display de un parámetro de lab por su parameter_key canónico (con fallback humanizado). */
export function getLabParamMeta(parameterKey: string): LabParamMeta {
  const m = LAB_PARAM_META[parameterKey];
  if (m) return m;
  const human = parameterKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { display_name: human, abbr: human, description: '' };
}
