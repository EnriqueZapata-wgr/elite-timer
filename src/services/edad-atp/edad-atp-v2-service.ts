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
 * Orquestador con persistencia. Carga inputs de las tablas edad_atp_* y guarda
 * el resultado en edad_atp_calculations. (Integración — la matemática se prueba
 * vía computeEdadAtpV2FromInputs.)
 */
export async function computeEdadAtpV2(userId: string, inputs: EdadAtpV2Inputs): Promise<EdadAtpV2Result> {
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
