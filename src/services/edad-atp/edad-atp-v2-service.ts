/**
 * Edad ATP v2 — orquestador final (Edad Integral + 5 sub-edades).
 * EDAD ATP Sprint 1/N.
 *
 * `computeEdadAtpV2FromInputs` es PURO y VERIFICADO contra el paciente HOMBRES V7:
 *   - sin cognitivo → Integral = Algoritmo Excel = 54.55
 *   - con Edad Cognitiva 58 → modificador +0.8 → Integral = 55.35
 *
 * `computeEdadAtpV2(userId)` carga los inputs de las tablas edad_atp_* y persiste
 * el resultado. La carga/persistencia DB es integración (mock en sprint posterior);
 * la lógica de cálculo se verifica vía la función pura.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import type {
  BodyComposition, DomainKey, EdadAtpV1Result, EdadAtpV2Result, PhenoAgeBiomarkers, Sex,
  SubEdadResult,
} from '@/src/types/edad-atp-v2';
import { computeMotorV2 } from './motor-v2-service';
import { buildMotorV2Input } from './motor-v2-adapter';
import { motorResultToView } from './motor-v2-view';
import { computeAlgoritmoExcel } from './algoritmo-excel-service';
import { computeReactionTimeAge, computeCognitiveModifier } from './cognitive-age-service';
import { computeEdadMetabolica } from './sub-edad-metabolica-service';
import { computeEdadCorporal } from './sub-edad-corporal-service';
import { computeEdadCardiovascular, type Race } from './sub-edad-cardiovascular-service';
import { computeEdadFitness } from './sub-edad-fitness-service';
import { scoreQuestionnaireResponses } from './questionnaire-scoring';
import { computeSFGlobalReal } from './sf-9band-service';
import { loadAllParamValues } from './load-all-params';
import { coalesceHealthRows, HEALTH_COALESCE_ROWS } from './capture-service';
import { SF_DOMAIN_WEIGHTS } from '@/src/constants/edad-atp-v2-model';

export type EdadAtpV2Inputs = {
  chronological_age: number;
  sex: Sex;
  phenoage_biomarkers: PhenoAgeBiomarkers;
  domain_scores: Partial<Record<DomainKey, number>>;
  body_composition: BodyComposition;
  // Inputs de las sub-edades (sin sex/chronological_age — el orquestador los inyecta).
  metabolic: {
    glucose_mg_dl?: number;
    insulin_uU_ml?: number;
    hba1c_pct?: number;
    hdl_mg_dl?: number;
    triglycerides_mg_dl?: number;
    cgm_time_in_range_pct?: number;
    waist_cm?: number;
  };
  cardiovascular: {
    total_cholesterol_mg_dl: number;
    hdl_mg_dl: number;
    systolic_bp_mmHg: number;
    on_htn_treatment: boolean;
    has_diabetes: boolean;
    smoker: boolean;
    race?: Race;
  };
  fitness: {
    vo2max_ml_kg_min?: number;
    grip_strength_kg?: number;
    push_ups_max?: number;
    resting_hr_bpm?: number;
    recovery_hr_drop_bpm?: number;
  };
  reaction_time?: { rt_simple_ms: number; rt_choice_ms: number };
  // Dict plano de los 138 params de la matriz (loadAllParamValues) — alimenta las
  // sub-edades display basadas en SF de dominio (cardio/metabólica/corporal/fitness).
  paramValues?: Record<string, number>;
};

export function computeEdadAtpV2FromInputs(inputs: EdadAtpV2Inputs): EdadAtpV1Result {
  const { chronological_age, sex } = inputs;

  // 1. Algoritmo Excel (base sin cognitivo).
  const excel = computeAlgoritmoExcel({
    chronological_age,
    sex,
    phenoage_biomarkers: inputs.phenoage_biomarkers,
    domain_scores: inputs.domain_scores,
    body_composition: inputs.body_composition,
  });

  // 2-4. Edad Cognitiva + modificador (única sub-edad que pesa).
  let edadCognitiva = chronological_age;
  let modificador = 0;
  const hasCognitive = !!inputs.reaction_time;
  if (inputs.reaction_time) {
    edadCognitiva = computeReactionTimeAge({ ...inputs.reaction_time, sex });
    modificador = computeCognitiveModifier({ edad_cognitiva: edadCognitiva, chronological_age }).modificador;
  }

  // 5. Edad Integral.
  const edad_integral = excel.algoritmo_excel + modificador;

  // 6. Sub-edades display — todas desde SF de dominio de la matriz (curva sfToAge).
  const pv = inputs.paramValues ?? {};
  const metabolica = computeEdadMetabolica({ paramValues: pv, sex, chronological_age });
  const corporal = computeEdadCorporal({ paramValues: pv, sex, chronological_age });
  const cardiovascular = computeEdadCardiovascular({ paramValues: pv, sex, chronological_age });
  const fitness = computeEdadFitness({ paramValues: pv, sex, chronological_age });
  const cognitiva: SubEdadResult = {
    age_years: edadCognitiva,
    ce_percent: hasCognitive ? 100 : 0,
    components: {
      reaction_time: {
        value: inputs.reaction_time?.rt_choice_ms ?? 0,
        score_0_100: 0,
        weight: 1,
        missing: !hasCognitive,
      },
    },
  };

  // 7. CE Integral (aprox §7): mezcla CE del Excel con presencia de cognitivo.
  const ce_integral = excel.ce_excel * 0.85 + (hasCognitive ? 0.15 : 0);

  return {
    chronological_age,
    edad_integral,
    algoritmo_excel: excel.algoritmo_excel,
    modificador_cognitivo: modificador,
    phenoage: excel.phenoage,
    sf_score: excel.sf_score,
    ritmo_envejecimiento: excel.ritmo_envejecimiento,
    ce_integral,
    sub_edades: { metabolica, corporal, cardiovascular, fitness, cognitiva },
  };
}

/** Reduce filas key/value a un objeto plano (última medición por key). */
function rowsToMap(rows: { key: string; value: number | null }[] | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) if (r.value != null && out[r.key] === undefined) out[r.key] = r.value;
  return out;
}

/**
 * Mapea UnifiedUserData (plano, de loadUserData) → EdadAtpV2Inputs (anidado).
 * Rellena con defaults neutrales lo que falte: PhenoAge → PHENOAGE_DEFAULTS,
 * composición/cardio → valores típicos. domain_scores = placeholder neutral
 * hasta Sprint 5. PURO (testeable sin DB).
 */
export function buildInputsFromUnified(data: UnifiedUserData): EdadAtpV2Inputs {
  const age = data.chronological_age;
  const n = (v: number | undefined, fallback: number) => (v != null ? v : fallback);
  return {
    chronological_age: age,
    sex: data.sex,
    phenoage_biomarkers: {
      albumin_g_dl: n(data.albumin_g_dl, PHENOAGE_DEFAULTS.albumin),
      creatinine_mg_dl: n(data.creatinine_mg_dl, PHENOAGE_DEFAULTS.creatinine),
      glucose_mg_dl: n(data.glucose_mg_dl, PHENOAGE_DEFAULTS.glucose),
      crp_mg_dl: n(data.pcr_mg_dl, PHENOAGE_DEFAULTS.crp),
      lymphocyte_pct: n(data.lymphocyte_pct, PHENOAGE_DEFAULTS.lymphocyte_pct),
      mcv_fl: n(data.mcv_fl, PHENOAGE_DEFAULTS.mcv),
      rdw_cv_pct: n(data.rdw_cv_pct, PHENOAGE_DEFAULTS.rdw_cv),
      alp_u_l: n(data.alp_u_l, PHENOAGE_DEFAULTS.alp),
      wbc_per_ul: n(data.wbc_per_ul, PHENOAGE_DEFAULTS.wbc),
      chronological_age: age,
    },
    domain_scores: data.sf_scores_by_domain ?? {},
    body_composition: {
      weight_kg: n(data.weight_kg, 80),
      height_cm: n(data.height_cm, 175),
      body_fat_pct: n(data.body_fat_pct, 22),
      skeletal_muscle_pct: n(data.skeletal_muscle_pct, 36),
      visceral_fat: n(data.visceral_fat, 8),
      grip_strength_kg: data.grip_strength_kg,
    },
    metabolic: {
      glucose_mg_dl: data.glucose_mg_dl,
      insulin_uU_ml: data.insulin_uU_ml,
      hba1c_pct: data.hba1c_pct,
      hdl_mg_dl: data.hdl_mg_dl,
      triglycerides_mg_dl: data.triglycerides_mg_dl,
      waist_cm: data.waist_cm,
    },
    cardiovascular: {
      total_cholesterol_mg_dl: n(data.total_cholesterol_mg_dl, 180),
      hdl_mg_dl: n(data.hdl_mg_dl, 50),
      systolic_bp_mmHg: n(data.systolic_bp_mmHg, 120),
      // Proxy clínico de diabetes desde labs (ADA: HbA1c ≥ 6.5% o glucosa ayuno ≥ 126).
      has_diabetes:
        (data.hba1c_pct != null && data.hba1c_pct >= 6.5) ||
        (data.glucose_mg_dl != null && data.glucose_mg_dl >= 126),
      // TODO Sprint 5: leer tratamiento HTN y tabaquismo desde cuestionarios/perfil.
      on_htn_treatment: false,
      smoker: false,
      race: 'other',
    },
    fitness: {
      vo2max_ml_kg_min: data.vo2max_ml_kg_min,
      grip_strength_kg: data.grip_strength_kg,
      push_ups_max: data.push_ups_max,
      resting_hr_bpm: data.resting_hr_bpm,
    },
    reaction_time:
      data.reaction_time_simple_ms != null && data.reaction_time_choice_ms != null
        ? { rt_simple_ms: data.reaction_time_simple_ms, rt_choice_ms: data.reaction_time_choice_ms }
        : undefined,
  };
}

/**
 * Orquestador con persistencia. Lee TODAS las fuentes vía loadUserData (lab_results,
 * health_measurements, lab_uploads, edad_atp_*), arma los inputs y guarda el
 * resultado en edad_atp_calculations. (Integración — la matemática se prueba
 * vía computeEdadAtpV2FromInputs.)
 */
export async function computeEdadAtpV2(userId: string): Promise<EdadAtpV2Result> {
  const data = await loadUserData(userId);
  const paramValues = await loadAllParamValues(userId, data.sex);
  const motorInput = buildMotorV2Input(data, paramValues);
  const motor = computeMotorV2(motorInput);
  const result = motorResultToView(motor);
  try {
    await supabase.from('edad_atp_calculations').insert({
      user_id: userId,
      chronological_age: result.chronological_age,
      edad_integral: result.edad_integral,
      ce_integral: result.ce_integral,
      // Las 5 columnas legacy se mapean a las 5 áreas v2 (no se migra el esquema SQL).
      edad_metabolica: motor.areas.riesgos.edad_ajustada,
      edad_corporal: motor.areas.composicion.edad_ajustada,
      edad_cardiovascular: motor.areas.labs.edad_ajustada,
      edad_fitness: motor.areas.fitness.edad_ajustada,
      edad_cognitiva: motor.areas.cognicion.edad_ajustada,
    });
  } catch (err) {
    logWarn('[edad-atp-v2] persist calculation failed:', err);
  }
  return result;
}

// motorResultToView vive en motor-v2-view.ts (módulo puro, testeable sin mock de
// supabase). Se re-exporta para no romper imports existentes.
export { motorResultToView } from './motor-v2-view';

// `rowsToMap` se exporta para el loader de inputs del Sprint 2 (captura de datos).
export { rowsToMap };

// ============================================================
// Sprint 2.5 — Lectura unificada de fuentes existentes
// ============================================================
// El usuario YA tiene labs en `lab_results`, composición/vitals en
// `health_measurements`, y PDFs parseados en `lab_uploads.extracted_data`.
// `loadUserData` lee de TODAS las fuentes y solo deja que la captura manual
// (edad_atp_*) llene lo que falta — evita re-pedir datos existentes.

/** Defaults clínicos neutrales para biomarcadores PhenoAge faltantes. */
export const PHENOAGE_DEFAULTS = {
  albumin: 4.5, creatinine: 0.9, glucose: 90, crp: 0.2,
  lymphocyte_pct: 30, mcv: 90, rdw_cv: 13, alp: 70, wbc: 6000,
} as const;

/** Edad por defecto si no hay date_of_birth en client_profiles (se flagea). */
const DEFAULT_AGE = 40;

export type DataSource =
  | 'lab_results' | 'lab_uploads' | 'health_measurements'
  | 'edad_atp_biomarkers' | 'edad_atp_body_composition'
  | 'edad_atp_questionnaire_responses' | 'edad_atp_functional_tests';

export interface UnifiedUserData {
  chronological_age: number;
  sex: Sex;
  // PhenoAge biomarkers
  albumin_g_dl?: number;
  creatinine_mg_dl?: number;
  glucose_mg_dl?: number;
  pcr_mg_dl?: number;
  lymphocyte_pct?: number;
  mcv_fl?: number;
  rdw_cv_pct?: number;
  alp_u_l?: number;
  wbc_per_ul?: number;
  // Composición corporal
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  skeletal_muscle_pct?: number;
  visceral_fat?: number;
  grip_strength_kg?: number;
  waist_cm?: number;
  // Vitals
  systolic_bp_mmHg?: number;
  diastolic_bp_mmHg?: number;
  resting_hr_bpm?: number;
  vo2max_ml_kg_min?: number;
  push_ups_max?: number;
  // Metabólico
  insulin_uU_ml?: number;
  hba1c_pct?: number;
  hdl_mg_dl?: number;
  triglycerides_mg_dl?: number;
  // Cardiovascular
  total_cholesterol_mg_dl?: number;
  ldl_mg_dl?: number;
  // Cognitivo
  reaction_time_simple_ms?: number;
  reaction_time_choice_ms?: number;
  // SF dominio scores (placeholder neutral hasta rangos de 9 bandas — Sprint 5)
  sf_scores_by_domain?: Partial<Record<DomainKey, number>>;
  // Metadata
  data_sources_used: DataSource[];
}

/** Primer valor numérico finito de la lista (jerarquía de fuentes). */
function firstNum(...vals: Array<number | null | undefined>): number | undefined {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

/** Cuenta los campos de datos efectivamente presentes en UnifiedUserData. */
export function countFields(data: UnifiedUserData): number {
  const meta = new Set(['chronological_age', 'sex', 'data_sources_used', 'sf_scores_by_domain']);
  const numeric = Object.entries(data).filter(([k, v]) => !meta.has(k) && v != null).length;
  return numeric + Object.keys(data.sf_scores_by_domain ?? {}).length;
}

/** Edad cronológica a partir de date_of_birth (YYYY-MM-DD). null si inválida. */
function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = parseLocalDate(dob);
  const today = parseLocalDate(getLocalToday());
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Lee y unifica TODAS las fuentes de datos del usuario en un objeto plano.
 * Las 8 queries corren en paralelo (Promise.all).
 * Jerarquía (lo más específico/reciente gana):
 *   edad_atp_biomarkers > lab_uploads.extracted_data > lab_results > health_measurements
 * (composición usa health_measurements > edad_atp_body_composition como fallback soft).
 */
export async function loadUserData(userId: string): Promise<UnifiedUserData> {
  let profile: any = null, lab: any = null, upload: any = null, hm: any = null;
  let bioRows: any[] = [], compRow: any = null, qRows: any[] = [], ftRows: any[] = [];
  try {
    const [pRes, labRes, upRes, hmRes, bioRes, compRes, qRes, ftRes] = await Promise.all([
      supabase.from('client_profiles').select('date_of_birth, biological_sex, height_cm').eq('user_id', userId).limit(1),
      supabase.from('lab_results').select('*').eq('user_id', userId).order('lab_date', { ascending: false }).limit(1),
      supabase.from('lab_uploads').select('extracted_data').eq('user_id', userId).not('extracted_data', 'is', null).order('uploaded_at', { ascending: false }).limit(1),
      supabase.from('health_measurements').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(HEALTH_COALESCE_ROWS),
      supabase.from('edad_atp_biomarkers').select('biomarker_key, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('edad_atp_body_composition').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(1),
      supabase.from('edad_atp_questionnaire_responses').select('domain, parameter_key, value_text').eq('user_id', userId),
      supabase.from('edad_atp_functional_tests').select('test_key, value_primary, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
    ]);
    profile = (pRes.data ?? [])[0] ?? null;
    lab = (labRes.data ?? [])[0] ?? null;
    upload = (upRes.data ?? [])[0] ?? null;
    // Coalesce por columna: el upsert diario por (user_id, date) fragmenta las métricas
    // entre filas — leer solo la última "perdía" VO2/peso de días previos (bug B1/B6).
    hm = coalesceHealthRows((hmRes.data ?? []) as Record<string, any>[]);
    bioRows = bioRes.data ?? [];
    compRow = (compRes.data ?? [])[0] ?? null;
    qRows = qRes.data ?? [];
    ftRows = ftRes.data ?? [];
  } catch (err) {
    logWarn('[edad-atp-v2] loadUserData query failed:', err);
  }

  // Biomarcadores manuales: rows ordenadas desc por measured_at → primera = más reciente.
  const bio: Record<string, number> = {};
  for (const r of bioRows) if (r.value != null && bio[r.biomarker_key] === undefined) bio[r.biomarker_key] = r.value;

  // extracted_data: soporta 2 shapes del parser:
  //   A (nested): { values: { albumin: { value: 4.48 } } }
  //   B (flat):   { albumin: 4.48 }
  const ext: Record<string, number> = {};
  const ev = upload?.extracted_data?.values ?? upload?.extracted_data;
  if (ev && typeof ev === 'object') {
    for (const [k, v] of Object.entries(ev)) {
      const val = typeof v === 'number' ? v : (v as any)?.value;
      if (typeof val === 'number' && Number.isFinite(val)) ext[k] = val;
    }
  }

  // Tests funcionales (RT, etc.).
  const ft: Record<string, number> = {};
  for (const r of ftRows) if (r.value_primary != null && ft[r.test_key] === undefined) ft[r.test_key] = r.value_primary;

  // SF placeholder: dominios contestados → 50 neutral (scores reales = Sprint 5).
  // Score real por dominio desde las respuestas (no placeholder 50).
  const sf_scores_by_domain = scoreQuestionnaireResponses(qRows as any);

  // Composición: % músculo puede venir como kg en health_measurements → convertir.
  const weight_kg = firstNum(hm?.weight_kg, compRow?.weight_kg);
  const muscleKg = firstNum(hm?.muscle_mass_kg);
  const skeletal_muscle_pct = firstNum(
    compRow?.skeletal_muscle_pct,
    muscleKg != null && weight_kg != null && weight_kg > 0 ? (muscleKg / weight_kg) * 100 : undefined,
  );

  const data_sources_used: DataSource[] = [];
  if (bioRows.length) data_sources_used.push('edad_atp_biomarkers');
  if (Object.keys(ext).length) data_sources_used.push('lab_uploads');
  if (lab) data_sources_used.push('lab_results');
  if (hm) data_sources_used.push('health_measurements');
  if (compRow) data_sources_used.push('edad_atp_body_composition');
  if (qRows.length) data_sources_used.push('edad_atp_questionnaire_responses');
  if (ftRows.length) data_sources_used.push('edad_atp_functional_tests');

  return {
    chronological_age: ageFromDob(profile?.date_of_birth) ?? DEFAULT_AGE,
    // Sex type no soporta 'intersex' → mapea a 'male' (default del orquestador).
    sex: profile?.biological_sex === 'female' ? 'female' : 'male',
    // Los 5 PhenoAge "nuevos" también viven en lab_uploads.extracted_data y en
    // lab_results (columnas añadidas por la migración 017) — no solo en captura manual.
    // rdw: lab_results usa columna `rdw` y el JSONB key `rdw` (sin _cv).
    // Fallbacks por sinónimo (es/en) en keys del extracted_data del parser AI.
    albumin_g_dl: firstNum(bio.albumin, ext.albumin, ext.albumina, ext.serum_albumin, lab?.albumin),
    creatinine_mg_dl: firstNum(bio.creatinine, ext.creatinine, ext.creatinina, lab?.creatinine),
    glucose_mg_dl: firstNum(bio.glucose, ext.glucose, ext.glucosa, lab?.glucose),
    pcr_mg_dl: firstNum(bio.crp, ext.pcr, ext.crp, ext.proteina_c_reactiva, lab?.pcr),
    lymphocyte_pct: firstNum(bio.lymphocyte_pct, ext.lymphocyte_pct, ext.linfocitos_pct, ext.lymphocytes_pct, lab?.lymphocyte_pct),
    mcv_fl: firstNum(bio.mcv, ext.mcv, ext.vcm, lab?.mcv),
    rdw_cv_pct: firstNum(bio.rdw_cv, ext.rdw_cv, ext.rdw, lab?.rdw),
    alp_u_l: firstNum(bio.alp, ext.alp, ext.fosfatasa_alcalina, lab?.alp),
    wbc_per_ul: firstNum(bio.wbc, ext.wbc, ext.leucocitos, lab?.wbc),
    weight_kg,
    height_cm: firstNum(hm?.height_cm, compRow?.height_cm, profile?.height_cm),
    body_fat_pct: firstNum(hm?.body_fat_pct, compRow?.body_fat_pct),
    skeletal_muscle_pct,
    visceral_fat: firstNum(hm?.visceral_fat, compRow?.visceral_fat),
    grip_strength_kg: firstNum(hm?.grip_strength_kg, compRow?.grip_strength_kg),
    waist_cm: firstNum(hm?.waist_cm),
    systolic_bp_mmHg: firstNum(bio.systolic_bp, hm?.systolic_bp),
    diastolic_bp_mmHg: firstNum(bio.diastolic_bp, hm?.diastolic_bp),
    resting_hr_bpm: firstNum(bio.resting_hr, hm?.resting_hr),
    vo2max_ml_kg_min: firstNum(bio.vo2max_estimated, hm?.vo2max_estimate),
    push_ups_max: firstNum(ft.push_ups_max),
    insulin_uU_ml: firstNum(bio.insulin, ext.insulin, lab?.insulin),
    hba1c_pct: firstNum(bio.hba1c, ext.hba1c, lab?.hba1c),
    hdl_mg_dl: firstNum(bio.hdl, ext.hdl, lab?.hdl),
    triglycerides_mg_dl: firstNum(bio.triglycerides, ext.triglycerides, lab?.triglycerides),
    total_cholesterol_mg_dl: firstNum(bio.total_cholesterol, ext.cholesterol_total, lab?.cholesterol_total),
    ldl_mg_dl: firstNum(bio.ldl, ext.ldl, lab?.ldl),
    reaction_time_simple_ms: firstNum(ft.reaction_time_simple),
    reaction_time_choice_ms: firstNum(ft.reaction_time_choice),
    sf_scores_by_domain,
    data_sources_used,
  };
}
