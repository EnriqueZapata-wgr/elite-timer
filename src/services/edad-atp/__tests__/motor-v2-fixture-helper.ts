/**
 * Helper de tests del motor v2: mapea los 4 pacientes del Excel (claves español de
 * `1_Inputs`) → MotorV2Input (claves del motor). Fuente: fixtures_4_pacientes.json.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import type { MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const fixtures = JSON.parse(readFileSync(join(__dirname, 'fixtures/motor_v2_fixtures.json'), 'utf-8'));

export type PatientKey = 'H1' | 'H2' | 'M1' | 'M2';
export const PATIENTS: PatientKey[] = ['H1', 'H2', 'M1', 'M2'];

type Raw = Record<string, { value: number; unit: string }>;

function v(raw: Raw, key: string): number {
  return raw[key]?.value;
}

export function inputFromFixture(pt: PatientKey): MotorV2Input {
  const raw = (fixtures as any)[pt].inputs as Raw;
  return {
    chronological_age: v(raw, 'Edad cronológica'),
    sex: v(raw, 'Sexo (M=1, F=0)') === 1 ? 'male' : 'female',
    albumin_g_dl: v(raw, 'Albúmina'),
    creatinine_mg_dl: v(raw, 'Creatinina sérica'),
    glucose_mg_dl: v(raw, 'Glucosa ayuno'),
    crp_mg_dl: v(raw, 'PCR (CRP)'),
    lymphocyte_pct: v(raw, '% Linfocitos'),
    mcv_fl: v(raw, 'VCM (MCV)'),
    rdw_cv_pct: v(raw, 'RDW-CV'),
    alp_u_l: v(raw, 'Fosfatasa Alcalina'),
    wbc_thousands_ul: v(raw, 'Leucocitos (WBC)'),
    vit_d: v(raw, 'Vit D (25-OH)'),
    vit_b12: v(raw, 'Vit B12'),
    homocysteine: v(raw, 'Homocisteína'),
    ferritin: v(raw, 'Ferritina'),
    tsh: v(raw, 'TSH'),
    cortisol: v(raw, 'Cortisol matutino'),
    bilirubin: v(raw, 'Bilirrubina total'),
    weight_kg: v(raw, 'Peso'),
    height_cm: v(raw, 'Altura'),
    body_fat_pct: v(raw, '% Grasa corporal'),
    muscle_pct: v(raw, '% Músculo esquelético'),
    visceral_fat: v(raw, 'Grasa visceral'),
    grip_strength_kg: v(raw, 'Fuerza de agarre'),
    waist_cm: v(raw, 'Cintura'),
    vo2max: v(raw, 'VO2max estimado'),
    push_ups: v(raw, 'Push-ups máx continuas'),
    squat_60s: v(raw, 'Sentadilla 60s'),
    balance_1leg_s: v(raw, 'Balance 1 pie ojos abiertos'),
    plank_s: v(raw, 'Plank máx'),
    bolt_s: v(raw, 'BOLT'),
    recovery_hr: v(raw, 'Recovery HR 2-min'),
    old_man_test: v(raw, 'Old Man Test'),
    rt_simple_ms: v(raw, 'RT Simple promedio'),
    rt_choice_ms: v(raw, 'RT Choice 4-AFC promedio'),
    go_no_go_rt_hits_ms: v(raw, 'Go/No-Go RT hits'),
    go_no_go_error_pct: v(raw, 'Go/No-Go tasa errores'),
    mental_clarity: v(raw, 'Claridad mental'),
    mental_energy: v(raw, 'Energía mental'),
    memory_self: v(raw, 'Memoria autopercibida'),
    apob: v(raw, 'ApoB'),
    ldl: v(raw, 'LDL'),
    hdl: v(raw, 'HDL'),
    total_cholesterol: v(raw, 'Colesterol Total'),
    triglycerides: v(raw, 'Triglicéridos'),
    systolic_bp: v(raw, 'PA Sistólica'),
    diastolic_bp: v(raw, 'PA Diastólica'),
    hba1c_pct: v(raw, 'HbA1c'),
    insulin: v(raw, 'Insulina ayuno'),
    homa_ir: v(raw, 'HOMA-IR'),
    nlr: v(raw, 'NLR (Neutróf/Linfo)'),
    testo_or_estradiol: v(raw, 'Testo total (H) / Estradiol (M)'),
    ast: v(raw, 'AST'),
    alt: v(raw, 'ALT'),
    ggt: v(raw, 'GGT'),
    bun: v(raw, 'BUN'),
    ayuno_if_h: v(raw, 'Ayuno IF'),
    ejercicio_h_sem: v(raw, 'Ejercicio'),
    pasos: v(raw, 'Pasos'),
    tabaquismo_cig: v(raw, 'Tabaquismo'),
    alcohol_mes: v(raw, 'Alcohol'),
    sueno_h: v(raw, 'Sueño'),
    consistencia_sueno_min: v(raw, 'Consistencia sueño'),
  };
}

export function expectedFor(pt: PatientKey) {
  return (fixtures as any)[pt].expected as Record<string, number>;
}
