/**
 * Edad ATP v2 — tipos compartidos del modelo Edad Integral.
 * EDAD ATP Sprint 1/N (Foundations).
 */

export type Sex = 'male' | 'female';

export type DomainKey =
  | 'cardiovascular' | 'composicion_corporal' | 'habitos'
  | 'inflamacion' | 'inmunidad' | 'metabolismo'
  | 'renal_micronutrientes' | 'sistema_hormonal' | 'sueno' | 'vitalidad';

export type PhenoAgeBiomarkers = {
  albumin_g_dl: number;
  creatinine_mg_dl: number;
  glucose_mg_dl: number;
  crp_mg_dl: number;
  lymphocyte_pct: number;
  mcv_fl: number;
  rdw_cv_pct: number;
  alp_u_l: number;
  wbc_per_ul: number;
  chronological_age: number;
};

export type BodyComposition = {
  weight_kg: number;
  height_cm: number;
  body_fat_pct: number;
  skeletal_muscle_pct: number;
  visceral_fat: number;
  grip_strength_kg?: number;
  ffmi?: number; // calculado si no se pasa
};

export type EdadCorporalAdjustments = {
  grasa_visceral: number;
  ffmi: number;
  fuerza_agarre: number;
  pct_grasa: number;
  pct_musculo: number;
};

export type SubEdadResult = {
  age_years: number;
  ce_percent: number; // 0-100, calidad de evaluación
  components: Record<string, { value: number; score_0_100: number; weight: number; missing: boolean }>;
};

export type EdadAtpV2Result = {
  chronological_age: number;
  edad_integral: number;
  algoritmo_excel: number;
  modificador_cognitivo: number;
  phenoage: number;
  sf_score: number;
  ritmo_envejecimiento: number;
  ce_integral: number; // 0-1
  sub_edades: {
    metabolica: SubEdadResult;
    corporal: SubEdadResult;
    cardiovascular: SubEdadResult;
    fitness: SubEdadResult;
    cognitiva: SubEdadResult;
  };
};
