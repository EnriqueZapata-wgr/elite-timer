/**
 * Motor Edad ATP v2 — tipos del modelo por áreas ciegas.
 * Independiente de `edad-atp-v2.ts` (modelo v1, que se mantiene para tests legacy).
 */
import type { Sex } from '@/src/types/edad-atp-v2';
import type { MotorAreaKey } from '@/src/constants/edad-atp-motor-v2-config';

/** Un componente (param/test) que alimenta un área: valor crudo + score 0-100 + peso. */
export type AreaComponent = {
  value: number | null;
  score_0_100: number | null; // null si el dato falta
  weight: number;
};

/** Resultado ciego de un área (antes del anclaje a cronológica). */
export type AreaCiegaResult = {
  edad_ciega: number;
  /** Score 0-100 del área (no aplica a Labs/Cognición, que mapean por edad directa). */
  score: number | null;
  /** CE 0-1: fracción del peso con dato presente. */
  ce: number;
  components: Record<string, AreaComponent>;
};

/** Área dentro del MotorV2Result: ciega + ajustada + metadatos de configuración. */
export type MotorAreaResult = AreaCiegaResult & {
  edad_ajustada: number;
  peso: number;
  factor_anclaje: number;
};

export type MotorV2Result = {
  edad_atp_integral: number;
  cronologica: number;
  delta_anos: number; // cron − integral (positivo = más joven)
  areas: Record<MotorAreaKey, MotorAreaResult>;
  habitos: { score: number; factor: number };
  edad_pre_modulador: number;
  capped: boolean;
};

/**
 * Input normalizado del motor v2: todos los valores crudos en las unidades del Excel
 * (`1_Inputs`). El orquestador lo arma desde `loadAllParamValues` + perfil; el test de
 * fixtures lo arma desde el JSON. Campos opcionales = dato ausente (área baja su CE).
 */
export type MotorV2Input = {
  chronological_age: number;
  sex: Sex;
  // Labs PhenoAge (9)
  albumin_g_dl?: number;
  creatinine_mg_dl?: number;
  glucose_mg_dl?: number;
  crp_mg_dl?: number;
  lymphocyte_pct?: number;
  mcv_fl?: number;
  rdw_cv_pct?: number;
  alp_u_l?: number;
  wbc_thousands_ul?: number;
  // Labs modificadores funcionales (7)
  vit_d?: number;
  vit_b12?: number;
  homocysteine?: number;
  ferritin?: number;
  tsh?: number;
  cortisol?: number;
  bilirubin?: number;
  // Composición
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  muscle_pct?: number;
  visceral_fat?: number;
  grip_strength_kg?: number;
  waist_cm?: number;
  // Fitness
  vo2max?: number;
  push_ups?: number;
  squat_60s?: number;
  balance_1leg_s?: number;
  plank_s?: number;
  bolt_s?: number;
  recovery_hr?: number;
  old_man_test?: number;
  // Cognición
  rt_simple_ms?: number;
  rt_choice_ms?: number;
  go_no_go_rt_hits_ms?: number;
  go_no_go_error_pct?: number;
  mental_clarity?: number;
  mental_energy?: number;
  memory_self?: number;
  // Riesgos cardio
  apob?: number;
  ldl?: number;
  hdl?: number;
  total_cholesterol?: number;
  triglycerides?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  // Riesgos metabólico
  hba1c_pct?: number;
  insulin?: number;
  homa_ir?: number;
  // Riesgos inflamatorio
  nlr?: number;
  // Riesgos hormonal
  testo_or_estradiol?: number;
  // Riesgos hepato-renal
  ast?: number;
  alt?: number;
  ggt?: number;
  bun?: number;
  // Hábitos
  ayuno_if_h?: number;
  ejercicio_h_sem?: number;
  pasos?: number;
  tabaquismo_cig?: number;
  alcohol_mes?: number;
  sueno_h?: number;
  consistencia_sueno_min?: number;
};
