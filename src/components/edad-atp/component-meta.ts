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
