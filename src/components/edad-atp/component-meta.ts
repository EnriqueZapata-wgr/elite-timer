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
import { EXTRACTED_KEY_ALIASES } from '@/src/constants/lab-canonical-map';

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

  // ─── Lote 1 (sprint 094): con banda funcional en matriz V7/V6 ───
  anti_tpo: { display_name: 'Anticuerpos Anti-TPO', abbr: 'Anti-TPO', unit: 'UI/mL', description: 'Anticuerpos contra la tiroides. Elevados orientan a tiroiditis autoinmune (Hashimoto).' },
  anti_tg: { display_name: 'Anticuerpos Anti-Tiroglobulina', abbr: 'Anti-TG', unit: 'UI/mL', description: 'Otro anticuerpo tiroideo; acompaña a anti-TPO en la evaluación autoinmune de la tiroides.' },
  progesterone: { display_name: 'Progesterona', abbr: 'Progesterona', unit: 'ng/mL', description: 'Hormona del ciclo y del embarazo. Varía mucho según la fase del ciclo menstrual.' },
  calcium: { display_name: 'Calcio', abbr: 'Ca', unit: 'mg/dL', description: 'Mineral clave de hueso, músculo y nervios. El cuerpo lo regula de forma muy estrecha.' },
  phosphorus: { display_name: 'Fósforo', abbr: 'P', unit: 'mg/dL', description: 'Mineral que trabaja junto al calcio en hueso y en la energía celular.' },
  neutrophils_pct: { display_name: 'Neutrófilos %', abbr: 'Neutrófilos', unit: '%', description: 'El glóbulo blanco más abundante; primera línea ante infecciones bacterianas.' },
  total_protein: { display_name: 'Proteínas totales', abbr: 'Prot. totales', unit: 'g/dL', description: 'Suma de albúmina y globulinas en sangre. Refleja nutrición, hígado e inmunidad.' },

  // ─── Lote 2A (sprint 094): clinical_only (sin banda funcional aún) ───
  t4_free: { display_name: 'T4 Libre', abbr: 'T4 libre', unit: 'ng/dL', description: 'Hormona tiroidea libre disponible. Se interpreta junto a TSH y T3.' },
  total_t3: { display_name: 'T3 Total', abbr: 'T3 total', unit: 'ng/dL', description: 'Fracción total de la hormona tiroidea T3 (libre + unida a proteínas).' },
  total_t4: { display_name: 'T4 Total', abbr: 'T4 total', unit: 'µg/dL', description: 'Fracción total de la hormona tiroidea T4 (libre + unida a proteínas).' },
  dhea: { display_name: 'DHEA', abbr: 'DHEA', unit: 'µg/dL', description: 'Hormona suprarrenal precursora de andrógenos y estrógenos. Baja con la edad.' },
  shbg: { display_name: 'SHBG', abbr: 'SHBG', unit: 'nmol/L', description: 'Proteína que transporta hormonas sexuales; modula cuánta testosterona queda libre.' },
  igf1: { display_name: 'IGF-1', abbr: 'IGF-1', unit: 'ng/mL', description: 'Mediador de la hormona del crecimiento. Refleja el eje GH y el estado anabólico.' },
  non_hdl_cholesterol: { display_name: 'Colesterol No-HDL', abbr: 'No-HDL', unit: 'mg/dL', description: 'Todo el colesterol aterogénico (total menos HDL). Buen marcador de riesgo cardiovascular.' },
  lp_a: { display_name: 'Lipoproteína(a)', abbr: 'Lp(a)', unit: 'mg/dL', description: 'Partícula de riesgo cardiovascular en gran parte determinada por la genética.' },
  zinc: { display_name: 'Zinc', abbr: 'Zinc', unit: 'µg/dL', description: 'Mineral de inmunidad, piel y hormonas. El déficit es común con dieta pobre.' },
  esr: { display_name: 'VSG', abbr: 'VSG', unit: 'mm/h', description: 'Velocidad de sedimentación: marcador inespecífico de inflamación.' },
  fibrinogen: { display_name: 'Fibrinógeno', abbr: 'Fibrinógeno', unit: 'mg/dL', description: 'Proteína de coagulación; también se eleva con inflamación.' },
  complement_c3: { display_name: 'Complemento C3', abbr: 'C3', unit: 'mg/dL', description: 'Parte del sistema del complemento (inmunidad). Se evalúa en autoinmunidad.' },
  complement_c4: { display_name: 'Complemento C4', abbr: 'C4', unit: 'mg/dL', description: 'Parte del complemento; acompaña a C3 en el estudio inmune.' },
  pt: { display_name: 'Tiempo de Protrombina', abbr: 'TP', unit: 'seg', description: 'Mide una vía de la coagulación; se reporta junto al INR.' },
  ptt: { display_name: 'Tiempo Parcial de Tromboplastina', abbr: 'TTP', unit: 'seg', description: 'Evalúa otra rama de la cascada de coagulación.' },
  inr: { display_name: 'INR', abbr: 'INR', unit: 'índice', description: 'Estandariza el tiempo de protrombina; clave si tomas anticoagulantes.' },
  bilirubin_direct: { display_name: 'Bilirrubina Directa', abbr: 'Bili. directa', unit: 'mg/dL', description: 'Fracción conjugada de la bilirrubina; orienta a problema hepático o biliar.' },
  bilirubin_indirect: { display_name: 'Bilirrubina Indirecta', abbr: 'Bili. indirecta', unit: 'mg/dL', description: 'Fracción no conjugada; se eleva con mayor recambio de glóbulos rojos.' },
  globulin: { display_name: 'Globulina', abbr: 'Globulina', unit: 'g/dL', description: 'Conjunto de proteínas inmunes y de transporte en la sangre.' },
  co2: { display_name: 'CO2 (Bicarbonato)', abbr: 'CO2', unit: 'mEq/L', description: 'Refleja el equilibrio ácido-base del cuerpo.' },
  gfr: { display_name: 'Tasa de Filtración Glomerular (TFG)', abbr: 'TFG', unit: 'mL/min', description: 'Estima qué tan bien filtran los riñones. Marcador central de función renal.' },
  platelets: { display_name: 'Plaquetas', abbr: 'Plaquetas', unit: '×10³/µL', description: 'Células de la coagulación. Bajas sangran fácil; muy altas pueden coagular de más.' },
  rbc: { display_name: 'Eritrocitos', abbr: 'Eritrocitos', unit: 'M/µL', description: 'Recuento de glóbulos rojos; acompaña a hemoglobina y hematocrito.' },
  mch: { display_name: 'HCM (Hemoglobina Corpuscular Media)', abbr: 'HCM', unit: 'pg', description: 'Cuánta hemoglobina lleva en promedio cada glóbulo rojo.' },
  mchc: { display_name: 'CHCM (Concentración Corpuscular Media)', abbr: 'CHCM', unit: 'g/dL', description: 'Concentración de hemoglobina dentro del glóbulo rojo.' },
  mpv: { display_name: 'VPM (Volumen Plaquetario Medio)', abbr: 'VPM', unit: 'fL', description: 'Tamaño promedio de las plaquetas.' },
  monocytes_pct: { display_name: 'Monocitos %', abbr: 'Monocitos', unit: '%', description: 'Glóbulos blancos que limpian y presentan antígenos.' },
  eosinophils_pct: { display_name: 'Eosinófilos %', abbr: 'Eosinófilos', unit: '%', description: 'Glóbulos blancos ligados a alergias y parásitos.' },
  basophils_pct: { display_name: 'Basófilos %', abbr: 'Basófilos', unit: '%', description: 'Glóbulos blancos poco abundantes, parte de la respuesta alérgica.' },
  fructosamine: { display_name: 'Fructosamina', abbr: 'Fructosamina', unit: 'µmol/L', description: 'Promedio de glucosa de las últimas 2-3 semanas; alternativa de corto plazo a la HbA1c.' },
  c_peptide: { display_name: 'Péptido C', abbr: 'Péptido C', unit: 'ng/mL', description: 'Refleja cuánta insulina propia produce el páncreas.' },

  // ─── Lote 2B (sprint 094): clinical_only, NUEVOS (keys canónicas en español) ───
  antigeno_prostatico_especifico: { display_name: 'Antígeno Prostático Específico (PSA)', abbr: 'PSA', unit: 'ng/mL', description: 'Marcador de la próstata; se usa en tamizaje y seguimiento prostático.' },
  ca_125: { display_name: 'CA 125', abbr: 'CA 125', unit: 'U/mL', description: 'Marcador tumoral asociado sobre todo a ovario; inespecífico por sí solo.' },
  ca_19_9: { display_name: 'CA 19-9', abbr: 'CA 19-9', unit: 'U/mL', description: 'Marcador tumoral ligado a páncreas y vía biliar.' },
  ca_15_3: { display_name: 'CA 15-3', abbr: 'CA 15-3', unit: 'U/mL', description: 'Marcador usado en el seguimiento de cáncer de mama.' },
  cea: { display_name: 'Antígeno Carcinoembrionario (CEA)', abbr: 'CEA', unit: 'ng/mL', description: 'Marcador tumoral inespecífico; útil en seguimiento, no en tamizaje general.' },
  alfa_fetoproteina: { display_name: 'Alfa-Fetoproteína (AFP)', abbr: 'AFP', unit: 'ng/mL', description: 'Marcador de hígado y testículo; también se usa durante el embarazo.' },
  anticuerpos_antinucleares: { display_name: 'Anticuerpos Antinucleares (ANA)', abbr: 'ANA', unit: 'título', description: 'Tamizaje de enfermedad autoinmune (lupus y otras).' },
  anti_dna: { display_name: 'Anti-DNA', abbr: 'Anti-DNA', unit: 'IU/mL', description: 'Anticuerpo más específico del lupus; apoya el diagnóstico.' },
  anti_ccp: { display_name: 'Anti-CCP', abbr: 'Anti-CCP', unit: 'U/mL', description: 'Anticuerpo específico de la artritis reumatoide.' },
  troponina_i: { display_name: 'Troponina I', abbr: 'Troponina I', unit: 'ng/mL', description: 'Proteína que se libera con daño del músculo cardiaco.' },
  troponina_t: { display_name: 'Troponina T', abbr: 'Troponina T', unit: 'ng/mL', description: 'Otra troponina cardiaca; marca lesión del corazón.' },
  bnp: { display_name: 'BNP', abbr: 'BNP', unit: 'pg/mL', description: 'Hormona que sube cuando el corazón está sobrecargado (insuficiencia cardiaca).' },
  nt_pro_bnp: { display_name: 'NT-proBNP', abbr: 'NT-proBNP', unit: 'pg/mL', description: 'Fragmento del BNP, mismo uso: estrés o insuficiencia cardiaca.' },
  ck_mb: { display_name: 'CK-MB', abbr: 'CK-MB', unit: 'U/L', description: 'Fracción cardiaca de la CPK; marca daño del corazón.' },
  hormona_antimulleriana: { display_name: 'Hormona Antimülleriana (AMH)', abbr: 'AMH', unit: 'ng/mL', description: 'Estima la reserva ovárica en la fertilidad femenina.' },
  inhibina_b: { display_name: 'Inhibina B', abbr: 'Inhibina B', unit: 'pg/mL', description: 'Marcador de función ovárica y testicular.' },
  beta_hcg: { display_name: 'Beta-HCG', abbr: 'β-HCG', unit: 'mIU/mL', description: 'Hormona del embarazo; también marcador tumoral en ciertos casos.' },
  parathormona: { display_name: 'Parathormona (PTH)', abbr: 'PTH', unit: 'pg/mL', description: 'Hormona que regula el calcio junto con la vitamina D.' },
  calcitonina: { display_name: 'Calcitonina', abbr: 'Calcitonina', unit: 'pg/mL', description: 'Hormona tiroidea que baja el calcio; marcador de cierto tumor tiroideo.' },
  vitamina_d_125_activa: { display_name: 'Vitamina D 1,25 (activa)', abbr: '1,25-OH Vit D', unit: 'pg/mL', description: 'Forma activa de la vitamina D; se mide en casos específicos, no de rutina.' },
  acth: { display_name: 'ACTH', abbr: 'ACTH', unit: 'pg/mL', description: 'Señal de la hipófisis a las suprarrenales para producir cortisol.' },
  aldosterona: { display_name: 'Aldosterona', abbr: 'Aldosterona', unit: 'ng/dL', description: 'Hormona suprarrenal que regula sodio, potasio y presión arterial.' },
  renina: { display_name: 'Renina (actividad)', abbr: 'Renina', unit: 'ng/mL/h', description: 'Enzima renal que regula presión y sodio; se lee junto a la aldosterona.' },
  hormona_crecimiento_gh: { display_name: 'Hormona del Crecimiento (GH)', abbr: 'GH', unit: 'ng/mL', description: 'Hormona de crecimiento y reparación; varía mucho a lo largo del día.' },
  anti_hbs: { display_name: 'Anti-HBs (Hepatitis B)', abbr: 'Anti-HBs', unit: 'mIU/mL', description: 'Anticuerpo protector contra hepatitis B (por vacuna o infección pasada).' },
  hbsag: { display_name: 'HBsAg', abbr: 'HBsAg', unit: 'índice', description: 'Antígeno de superficie de hepatitis B; positivo indica infección.' },
  anti_hcv: { display_name: 'Anti-HCV (Hepatitis C)', abbr: 'Anti-HCV', unit: 'índice', description: 'Anticuerpo de tamizaje de hepatitis C.' },
  hiv: { display_name: 'VIH', abbr: 'VIH', unit: 'índice', description: 'Prueba de tamizaje de VIH.' },
  microalbuminuria: { display_name: 'Microalbuminuria', abbr: 'Microalbúmina', unit: 'mg/L', description: 'Albúmina en orina en bajas cantidades; marcador temprano de daño renal.' },
  cistatina_c: { display_name: 'Cistatina C', abbr: 'Cistatina C', unit: 'mg/L', description: 'Marcador de función renal, alternativa o complemento a la creatinina.' },
  dimero_d: { display_name: 'Dímero D', abbr: 'Dímero D', unit: 'µg/mL', description: 'Producto de degradación de coágulos; ayuda a descartar trombosis.' },
  procalcitonina: { display_name: 'Procalcitonina', abbr: 'PCT', unit: 'ng/mL', description: 'Marcador que se eleva en infecciones bacterianas serias.' },
  amonio: { display_name: 'Amonio', abbr: 'Amonio', unit: 'µg/dL', description: 'Desecho nitrogenado que el hígado depura; alto orienta a falla hepática.' },
  lactato: { display_name: 'Lactato', abbr: 'Lactato', unit: 'mmol/L', description: 'Sube con ejercicio intenso o falta de oxígeno en los tejidos.' },
  reticulocitos_pct: { display_name: 'Reticulocitos %', abbr: 'Reticulocitos', unit: '%', description: 'Glóbulos rojos jóvenes; indican cuánto produce la médula ósea.' },

  // ─── F4.3 (sprint UX blockers): keys canónicas INGLESAS sin contraparte española ───
  // (self-map en LAB_COLUMN_TO_CANONICAL — llegan tal cual a lab_values y el fallback
  // humanizado las mostraba en inglés).
  estradiol: { display_name: 'Estradiol', abbr: 'E2', unit: 'pg/mL', description: 'Principal estrógeno. Clave en ciclo, hueso y salud cardiovascular.' },
  cholesterol_total: { display_name: 'Colesterol total', abbr: 'Col. total', unit: 'mg/dL', description: 'Suma de las fracciones de colesterol. Importa el reparto entre HDL, LDL y triglicéridos.' },
  ag_ratio: { display_name: 'Índice Albúmina/Globulina', abbr: 'A/G', unit: 'índice', description: 'Relación entre albúmina y globulinas; orienta sobre nutrición, hígado e inflamación.' },
  testosterone_free: { display_name: 'Testosterona libre', abbr: 'Testo libre', unit: 'pg/mL', description: 'Fracción activa de la testosterona, disponible para los tejidos.' },
  ana: { display_name: 'Anticuerpos Antinucleares (ANA)', abbr: 'ANA', unit: 'título', description: 'Tamizaje de autoinmunidad; positivo requiere interpretación clínica.' },
  amh: { display_name: 'Hormona Antimülleriana', abbr: 'AMH', unit: 'ng/mL', description: 'Estima la reserva ovárica; útil en planeación reproductiva.' },
  inhibin_b: { display_name: 'Inhibina B', abbr: 'Inhibina B', unit: 'pg/mL', description: 'Marcador de función gonadal (reserva ovárica / espermatogénesis).' },
  rdw: { display_name: 'RDW (Amplitud de Distribución Eritrocitaria)', abbr: 'RDW', unit: '%', description: 'Variación de tamaño de los glóbulos rojos; sube en varias anemias.' },
  wbc: { display_name: 'Leucocitos', abbr: 'Leucocitos', unit: '10³/µL', description: 'Recuento de glóbulos blancos; el ejército inmune circulante.' },
  pcr: { display_name: 'Proteína C Reactiva', abbr: 'PCR', unit: 'mg/L', description: 'Marcador de inflamación sistémica; clave en riesgo cardiovascular.' },
  creatinine: { display_name: 'Creatinina', abbr: 'Creatinina', unit: 'mg/dL', description: 'Desecho muscular que filtran los riñones; marcador de función renal.' },
  glucose: { display_name: 'Glucosa', abbr: 'Glucosa', unit: 'mg/dL', description: 'Azúcar en sangre; central en salud metabólica.' },
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

/**
 * F4.3 (labels en español): varias keys canónicas quedaron en INGLÉS porque
 * EXTRACTED_KEY_ALIASES mapea la key española cruda → columna inglesa
 * (`microalbuminuria` → `microalbumin`), pero el meta español vive bajo la key
 * española. Este mapa inverso (en→es) resuelve el display sin duplicar metas.
 */
let REVERSE_ALIAS_META: Record<string, string> | null = null;
function reverseAliasMeta(): Record<string, string> {
  if (!REVERSE_ALIAS_META) {
    REVERSE_ALIAS_META = {};
    for (const [esKey, enKey] of Object.entries(EXTRACTED_KEY_ALIASES)) {
      if (LAB_PARAM_META[esKey] && !REVERSE_ALIAS_META[enKey]) REVERSE_ALIAS_META[enKey] = esKey;
    }
  }
  return REVERSE_ALIAS_META;
}

/** Display de un parámetro de lab por su parameter_key canónico (con fallback humanizado). */
export function getLabParamMeta(parameterKey: string): LabParamMeta {
  const m = LAB_PARAM_META[parameterKey];
  if (m) return m;
  const esKey = reverseAliasMeta()[parameterKey];
  if (esKey) return LAB_PARAM_META[esKey];
  const human = parameterKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { display_name: human, abbr: human, description: '' };
}
