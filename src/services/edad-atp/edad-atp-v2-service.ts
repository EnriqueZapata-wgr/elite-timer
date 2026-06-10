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
  BodyComposition, DomainKey, EdadAtpV2Result, PhenoAgeBiomarkers, Sex, SubEdadResult,
} from '@/src/types/edad-atp-v2';
import { computeAlgoritmoExcel } from './algoritmo-excel-service';
import { computeReactionTimeAge, computeCognitiveModifier } from './cognitive-age-service';
import { computeEdadMetabolica } from './sub-edad-metabolica-service';
import { computeEdadCorporal } from './sub-edad-corporal-service';
import { computeEdadCardiovascular, type Race } from './sub-edad-cardiovascular-service';
import { computeEdadFitness } from './sub-edad-fitness-service';

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
};

export function computeEdadAtpV2FromInputs(inputs: EdadAtpV2Inputs): EdadAtpV2Result {
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

  // 6. Sub-edades display.
  const metabolica = computeEdadMetabolica({ ...inputs.metabolic, sex, chronological_age });
  const corporal = computeEdadCorporal({ body_composition: inputs.body_composition, sex, chronological_age });
  const cardiovascular = computeEdadCardiovascular({
    ...inputs.cardiovascular, race: inputs.cardiovascular.race ?? 'other', chronological_age, sex,
  });
  const fitness = computeEdadFitness({ ...inputs.fitness, sex, chronological_age });
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
    },
    cardiovascular: {
      total_cholesterol_mg_dl: n(data.total_cholesterol_mg_dl, 180),
      hdl_mg_dl: n(data.hdl_mg_dl, 50),
      systolic_bp_mmHg: n(data.systolic_bp_mmHg, 120),
      on_htn_treatment: false,
      has_diabetes: false,
      smoker: false,
      race: 'other',
    },
    fitness: {
      vo2max_ml_kg_min: data.vo2max_ml_kg_min,
      grip_strength_kg: data.grip_strength_kg,
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
  const inputs = buildInputsFromUnified(data);
  const result = computeEdadAtpV2FromInputs(inputs);
  try {
    await supabase.from('edad_atp_calculations').insert({
      user_id: userId,
      chronological_age: result.chronological_age,
      edad_integral: result.edad_integral,
      algoritmo_excel: result.algoritmo_excel,
      modificador_cognitivo: result.modificador_cognitivo,
      phenoage: result.phenoage,
      sf_score: result.sf_score,
      ritmo_envejecimiento: result.ritmo_envejecimiento,
      ce_integral: result.ce_integral,
      edad_metabolica: result.sub_edades.metabolica.age_years,
      edad_corporal: result.sub_edades.corporal.age_years,
      edad_cardiovascular: result.sub_edades.cardiovascular.age_years,
      edad_fitness: result.sub_edades.fitness.age_years,
      edad_cognitiva: result.sub_edades.cognitiva.age_years,
    });
  } catch (err) {
    logWarn('[edad-atp-v2] persist calculation failed:', err);
  }
  return result;
}

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
  // Vitals
  systolic_bp_mmHg?: number;
  diastolic_bp_mmHg?: number;
  resting_hr_bpm?: number;
  vo2max_ml_kg_min?: number;
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
      supabase.from('lab_uploads').select('extracted_data').eq('user_id', userId).eq('status', 'extracted').order('uploaded_at', { ascending: false }).limit(1),
      supabase.from('health_measurements').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(1),
      supabase.from('edad_atp_biomarkers').select('biomarker_key, value, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
      supabase.from('edad_atp_body_composition').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(1),
      supabase.from('edad_atp_questionnaire_responses').select('domain').eq('user_id', userId),
      supabase.from('edad_atp_functional_tests').select('test_key, value_primary, measured_at').eq('user_id', userId).order('measured_at', { ascending: false }),
    ]);
    profile = (pRes.data ?? [])[0] ?? null;
    lab = (labRes.data ?? [])[0] ?? null;
    upload = (upRes.data ?? [])[0] ?? null;
    hm = (hmRes.data ?? [])[0] ?? null;
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

  // extracted_data.values[key].value (keys = columnas de lab_results, mismo parser).
  const ext: Record<string, number> = {};
  const ev = upload?.extracted_data?.values;
  if (ev && typeof ev === 'object') {
    for (const [k, v] of Object.entries(ev)) {
      const val = (v as any)?.value;
      if (typeof val === 'number' && Number.isFinite(val)) ext[k] = val;
    }
  }

  // Tests funcionales (RT, etc.).
  const ft: Record<string, number> = {};
  for (const r of ftRows) if (r.value_primary != null && ft[r.test_key] === undefined) ft[r.test_key] = r.value_primary;

  // SF placeholder: dominios contestados → 50 neutral (scores reales = Sprint 5).
  const sf_scores_by_domain: Partial<Record<DomainKey, number>> = {};
  for (const r of qRows) sf_scores_by_domain[r.domain as DomainKey] = 50;

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
    albumin_g_dl: firstNum(bio.albumin),
    creatinine_mg_dl: firstNum(bio.creatinine, ext.creatinine, lab?.creatinine),
    glucose_mg_dl: firstNum(bio.glucose, ext.glucose, lab?.glucose),
    pcr_mg_dl: firstNum(bio.crp, ext.pcr, lab?.pcr),
    lymphocyte_pct: firstNum(bio.lymphocyte_pct),
    mcv_fl: firstNum(bio.mcv),
    rdw_cv_pct: firstNum(bio.rdw_cv),
    alp_u_l: firstNum(bio.alp),
    wbc_per_ul: firstNum(bio.wbc, ext.wbc, lab?.wbc),
    weight_kg,
    height_cm: firstNum(hm?.height_cm, compRow?.height_cm, profile?.height_cm),
    body_fat_pct: firstNum(hm?.body_fat_pct, compRow?.body_fat_pct),
    skeletal_muscle_pct,
    visceral_fat: firstNum(hm?.visceral_fat, compRow?.visceral_fat),
    grip_strength_kg: firstNum(hm?.grip_strength_kg, compRow?.grip_strength_kg),
    systolic_bp_mmHg: firstNum(bio.systolic_bp, hm?.systolic_bp),
    diastolic_bp_mmHg: firstNum(bio.diastolic_bp, hm?.diastolic_bp),
    resting_hr_bpm: firstNum(bio.resting_hr, hm?.resting_hr),
    vo2max_ml_kg_min: firstNum(bio.vo2max_estimated, hm?.vo2max_estimate),
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
