/**
 * Adaptador DB → MotorV2Input. Toma UnifiedUserData (loadUserData) + los 138 params
 * de la matriz (loadAllParamValues, claves español) y arma el input normalizado del
 * motor v2 en las unidades del Excel.
 *
 * NOTA (flag): el motor está VERIFICADO contra los 4 fixtures vía la función pura. Este
 * adaptador es la capa de integración; su mapeo desde fuentes reales debe validarse en
 * runtime (smoke test). Campos sin fuente quedan undefined → el área baja su CE.
 *
 * Conversión de unidades clave:
 *   - %grasa/%músculo: la matriz guarda fracción decimal (0.11) → ×100 a % para el motor.
 *   - hematocrito/hba1c/rdw: NO los usa el motor v2 directamente como esas claves.
 *   - hba1c: el motor espera % (5.5); la matriz lo guarda como decimal (0.055) → ×100.
 */
import type { MotorV2Input } from '@/src/types/motor-edad-atp-v2';
import type { UnifiedUserData } from './edad-atp-v2-service';

type PV = Record<string, number>;

/** Primer valor numérico finito. */
function num(...vals: Array<number | null | undefined>): number | undefined {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

/** Si un % viene como fracción decimal (≤1), lo lleva a porcentaje (0.11 → 11). */
function asPct(v: number | undefined): number | undefined {
  if (v == null) return undefined;
  return v <= 1 ? v * 100 : v;
}

export function buildMotorV2Input(data: UnifiedUserData, pv: PV): MotorV2Input {
  return {
    chronological_age: data.chronological_age,
    sex: data.sex,
    // Labs PhenoAge (de UnifiedUserData, ya unificado de lab_results/uploads/biomarkers).
    albumin_g_dl: data.albumin_g_dl,
    creatinine_mg_dl: data.creatinine_mg_dl,
    glucose_mg_dl: data.glucose_mg_dl,
    crp_mg_dl: data.pcr_mg_dl,
    lymphocyte_pct: data.lymphocyte_pct,
    mcv_fl: data.mcv_fl,
    rdw_cv_pct: data.rdw_cv_pct != null ? asPct(data.rdw_cv_pct) : undefined,
    alp_u_l: data.alp_u_l,
    wbc_thousands_ul: data.wbc_per_ul != null ? data.wbc_per_ul / 1000 : undefined,
    // Labs modificadores (claves de matriz).
    vit_d: num(pv.vitamina_d),
    vit_b12: num(pv.vitamina_b12),
    homocysteine: num(pv.homocisteina),
    ferritin: num(pv.ferritina),
    tsh: num(pv.tsh),
    cortisol: num(pv.cortisol_matutino),
    bilirubin: num(pv.bilirrubina),
    // Composición (matriz guarda fracción decimal para % → a porcentaje).
    weight_kg: data.weight_kg,
    height_cm: data.height_cm,
    body_fat_pct: data.body_fat_pct ?? asPct(num(pv.grasa_corporal)),
    muscle_pct: data.skeletal_muscle_pct ?? asPct(num(pv.musculo_esqueletico)),
    visceral_fat: num(data.visceral_fat, pv.grasa_visceral),
    grip_strength_kg: num(data.grip_strength_kg, pv.fuerza_de_agarre),
    waist_cm: data.waist_cm,
    // Fitness (functional_tests / matriz).
    vo2max: num(data.vo2max_ml_kg_min, pv.vo2_max, pv.vo2_estimado),
    push_ups: num(data.push_ups_max, pv.pushups),
    squat_60s: num(pv.sentadilla_libre),
    balance_1leg_s: num(pv.test_de_equilibrio_en_un_pie),
    plank_s: num(pv.plank),
    bolt_s: num(pv.bolt),
    recovery_hr: num(pv.recovery_hr),
    old_man_test: num(pv.old_man_test),
    // Cognición (functional_tests).
    rt_simple_ms: num(data.reaction_time_simple_ms, pv.reaction_time_simple),
    rt_choice_ms: num(data.reaction_time_choice_ms, pv.reaction_time_choice),
    go_no_go_rt_hits_ms: num(pv.go_no_go_rt_hits),
    go_no_go_error_pct: num(pv.go_no_go_error_rate),
    mental_clarity: num(pv.claridad_mental),
    mental_energy: num(pv.energia_mental),
    memory_self: num(pv.memoria_autopercibida),
    // Riesgos cardio.
    apob: num(pv.apolipoproteinas_b),
    ldl: num(data.ldl_mg_dl, pv.colesterol_ldl),
    hdl: num(data.hdl_mg_dl, pv.colesterol_hdl),
    total_cholesterol: num(data.total_cholesterol_mg_dl, pv.colesterol_total),
    triglycerides: num(data.triglycerides_mg_dl, pv.trigliceridos),
    systolic_bp: num(data.systolic_bp_mmHg, pv.presion_sistolica),
    diastolic_bp: num(data.diastolic_bp_mmHg, pv.presion_diastolica),
    // Riesgos metabólico (hba1c: matriz decimal → %).
    hba1c_pct: num(data.hba1c_pct, pv.hba1c != null ? asPct(pv.hba1c) : undefined),
    insulin: num(data.insulin_uU_ml, pv.insulina),
    homa_ir: num(pv.homair),
    // Riesgos inflamatorio / hormonal / hepato-renal.
    nlr: num(pv.relacion_neutrofilos_linfocitos_nlr),
    testo_or_estradiol: num(pv.testosterona_total, pv.estradiol),
    ast: num(pv.transaminasa_glutamico_oxalacetica_ast, pv.transaminasa_g_oxalacetica_ast_tgo),
    alt: num(pv.transaminasa_glutamico_piruvica_alt),
    ggt: num(pv.ggt, pv.gama_glutamil_transferasa),
    bun: num(pv.nitrogeno_ureico_bun),
    // Hábitos (cuestionario hábitos).
    ayuno_if_h: num(pv.ayuno_intermitente),
    ejercicio_h_sem: num(pv.ejercicio_semanal),
    pasos: num(pv.pasos_al_dia),
    tabaquismo_cig: num(pv.tabaquismo),
    alcohol_mes: num(pv.consumo_de_alcohol_mensual),
    sueno_h: num(pv.horas_de_sueno, pv.sueno_horas),
    consistencia_sueno_min: num(pv.consistencia_sueno),
  };
}
