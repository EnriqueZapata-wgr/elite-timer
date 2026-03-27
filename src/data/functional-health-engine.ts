/**
 * Motor de Salud Funcional — 144 parámetros, 10 dominios, PhenoAge de Levine.
 * Rangos funcionales por sexo, ajustes por composición corporal.
 */

export type Sex = 'male' | 'female';
export type RatingLevel = 'out_of_range' | 'critical' | 'risk' | 'acceptable' | 'optimal';
export type DataSource = 'lab' | 'wearable' | 'forms' | 'tests' | 'calculation';

export interface Parameter {
  key: string;
  name: string;
  domain: string;
  source: DataSource;
  unit: string;
  weight: number;
  ranges: { male: (number | null)[]; female: (number | null)[] };
  direction: 'lower_better' | 'higher_better' | 'range';
}

export interface Domain {
  key: string;
  name: string;
  weight: number;
  parameters: Parameter[];
}

export interface ParameterResult {
  key: string; name: string; value: number | null; unit: string;
  rating: RatingLevel | 'no_data'; score: number; weight: number; weightedScore: number;
}

export interface DomainResult {
  key: string; name: string;
  functionalScore: number; evaluationQuality: number;
  weight: number; parameters: ParameterResult[];
}

export interface PhenoAgeResult {
  phenoAge: number; biologicalAgeFinal: number;
  mortScore: number; agingRate: number;
  adjustments: { marker: string; impact: number }[];
}

export interface HealthScore {
  functionalHealthScore: number;
  evaluationQuality: number;
  biologicalAge: number;
  metabolicAge: number;
  agingRate: number;
  domains: DomainResult[];
  phenoAge: PhenoAgeResult | null;
}

// === RATE VALUE ===

function rateValue(value: number, t: (number | null)[]): { rating: RatingLevel; score: number } {
  if (t[3] !== null && t[4] !== null) {
    if (t[3] <= t[4]) {
      // Rango normal: óptimo entre t[3] y t[4]
      if (value >= t[3] && value <= t[4]) return { rating: 'optimal', score: 100 };
      if (value < t[3]) {
        if (t[2] !== null && value >= t[2]) return { rating: 'acceptable', score: 80 };
        if (t[1] !== null && value >= t[1]) return { rating: 'risk', score: 50 };
        if (t[0] !== null && value >= t[0]) return { rating: 'critical', score: 25 };
        return { rating: 'out_of_range', score: 0 };
      }
      if (value > t[4]) {
        if (t[5] !== null && value <= t[5]) return { rating: 'acceptable', score: 80 };
        if (t[6] !== null && value <= t[6]) return { rating: 'risk', score: 50 };
        if (t[7] !== null && value <= t[7]) return { rating: 'critical', score: 25 };
        return { rating: 'out_of_range', score: 0 };
      }
    } else {
      // Higher is better: t[3] > t[4]
      if (value >= t[3]) return { rating: 'optimal', score: 100 };
      if (value >= t[4]) return { rating: 'acceptable', score: 80 };
      if (t[5] !== null && value >= t[5]) return { rating: 'risk', score: 50 };
      if (t[6] !== null && value >= t[6]) return { rating: 'critical', score: 25 };
      return { rating: 'out_of_range', score: 0 };
    }
  }
  return { rating: 'acceptable', score: 80 };
}

// === DOMINIOS (compacto: solo los parámetros clave de cada dominio) ===

const p = (key: string, name: string, domain: string, source: DataSource, unit: string, weight: number,
  male: (number | null)[], female: (number | null)[]): Parameter => ({
  key, name, domain, source, unit, weight, ranges: { male, female }, direction: 'range',
});

export const DOMAINS: Domain[] = [
  { key: 'metabolic', name: 'Metabolismo', weight: 0.15, parameters: [
    p('glucose_fasting', 'Glucosa ayuno', 'metabolic', 'lab', 'mg/dl', 0.12, [25,35,45,70,85,90,99,110], [25,35,45,70,85,90,99,110]),
    p('hba1c', 'HbA1c', 'metabolic', 'lab', '%', 0.18, [1,2.5,3.5,4.9,5.2,5.6,5.8,6], [1,2.5,3.5,4.9,5.2,5.6,5.8,6]),
    p('homa_ir', 'HOMA-IR', 'metabolic', 'lab', 'Ratio', 0.14, [null,null,null,0.1,1,1.5,2,3], [null,null,null,0.1,1,1.5,2,3]),
    p('insulin', 'Insulina', 'metabolic', 'lab', 'μUI/ml', 0.10, [null,null,null,2,6,8,10,15], [null,null,null,2,6,8,10,15]),
    p('tg_hdl_ratio', 'TG/HDL', 'metabolic', 'calculation', 'Ratio', 0.10, [null,null,null,0.1,1.8,2,2.5,2.8], [null,null,null,0.1,1.8,2,2.5,2.8]),
    p('triglycerides', 'Triglicéridos', 'metabolic', 'lab', 'mg/dl', 0.08, [null,null,null,30,70,100,150,160], [null,null,null,30,70,100,150,160]),
    p('ggt', 'GGT', 'metabolic', 'lab', 'U/l', 0.06, [55,50,35,25,10,8,5,0], [55,50,35,25,10,8,5,0]),
    p('alt', 'ALT', 'metabolic', 'lab', 'U/l', 0.06, [50,45,35,25,15,10,5,0], [50,45,35,25,15,10,5,0]),
    p('meals_per_day', 'Comidas/día', 'metabolic', 'forms', 'cantidad', 0.06, [null,null,null,1,2,3,4,5], [null,null,null,1,2,3,4,5]),
    p('atherogenic_index', 'Índ. Aterogénico', 'metabolic', 'lab', 'Ratio', 0.10, [null,null,null,0.1,2.5,3.5,4.5,6], [null,null,null,0.1,2.5,3.5,4.5,6]),
  ]},
  { key: 'cardiovascular', name: 'Cardiovascular', weight: 0.12, parameters: [
    p('vo2_estimated', 'VO2 estimado', 'cardiovascular', 'tests', 'ml/kg/min', 0.15, [null,null,null,100,50,42,36,30], [null,null,null,100,50,42,36,30]),
    p('systolic_bp', 'PA sistólica', 'cardiovascular', 'forms', 'mmHg', 0.12, [75,80,90,100,115,120,129,140], [75,80,90,100,115,120,129,140]),
    p('diastolic_bp', 'PA diastólica', 'cardiovascular', 'forms', 'mmHg', 0.08, [45,50,60,65,75,80,85,90], [45,50,60,65,75,80,85,90]),
    p('hdl', 'HDL', 'cardiovascular', 'lab', 'mg/dl', 0.10, [null,null,null,100,60,50,40,30], [null,null,null,100,60,50,40,30]),
    p('hemoglobin', 'Hemoglobina', 'cardiovascular', 'lab', 'g/dl', 0.08, [null,null,null,16,14.5,14,13.5,13], [null,null,null,15,12.5,12,11.5,11]),
    p('hematocrit', 'Hematocrito', 'cardiovascular', 'lab', '%', 0.05, [null,null,null,47,43,42,40,38], [null,null,null,44,39,37,36,34]),
    p('ldl', 'LDL', 'cardiovascular', 'lab', 'mg/dl', 0.07, [180,160,150,120,80,60,50,30], [180,160,150,120,80,60,50,30]),
    p('cholesterol_total', 'Col. total', 'cardiovascular', 'lab', 'mg/dl', 0.05, [350,280,250,220,180,150,130,115], [350,280,250,220,180,150,130,115]),
    p('triglycerides_cv', 'Triglicéridos', 'cardiovascular', 'lab', 'mg/dl', 0.05, [null,null,null,30,70,100,150,160], [null,null,null,30,70,100,150,160]),
    p('rdw_cv', 'RDW-CV', 'cardiovascular', 'lab', '%', 0.05, [null,null,null,11,12.5,13,14,14.5], [null,null,null,11,12.5,13,14,14.5]),
    p('ast', 'AST', 'cardiovascular', 'lab', 'U/l', 0.05, [50,45,35,25,15,10,5,0], [50,45,35,25,15,10,5,0]),
    p('vldl', 'VLDL', 'cardiovascular', 'lab', 'mg/dl', 0.05, [0,1,2,5,15,20,30,35], [0,1,2,5,15,20,30,35]),
    p('bilirubin', 'Bilirrubina', 'cardiovascular', 'lab', 'mg/dl', 0.05, [1.6,1.5,1.2,1,0.3,null,null,null], [1.6,1.5,1.2,1,0.3,null,null,null]),
    p('apo_b', 'Apo B', 'cardiovascular', 'lab', 'mg/dl', 0.05, [150,120,100,90,50,40,0,null], [150,120,100,90,50,40,0,null]),
  ]},
  { key: 'hormonal', name: 'Hormonal', weight: 0.12, parameters: [
    p('tsh', 'TSH', 'hormonal', 'lab', 'μU/ml', 0.18, [null,null,null,0.9,2,2.5,3,3.5], [null,null,null,0.9,2,2.5,3,3.5]),
    p('cortisol_am', 'Cortisol AM', 'hormonal', 'lab', 'μg/dl', 0.18, [null,null,null,15,12,10,8.5,8], [null,null,null,15,12,10,8.5,8]),
    p('testosterone_total', 'Testosterona total', 'hormonal', 'lab', 'ng/ml', 0.15, [null,null,null,12,7,6,4.5,3], [null,null,null,12,7,6,4.5,3]),
    p('t3_free', 'T3 libre', 'hormonal', 'lab', 'ng/dl', 0.12, [null,null,null,4.2,3.2,2.8,2.5,2.2], [null,null,null,4.2,3.2,2.8,2.5,2.2]),
    p('anti_tpo', 'Anti-TPO', 'hormonal', 'lab', 'UI/ml', 0.10, [null,null,null,0,10,20,30,35], [null,null,null,0,10,20,30,35]),
    p('anti_tg', 'Anti-TG', 'hormonal', 'lab', 'UI/ml', 0.10, [null,null,null,0,5,10,15,20], [null,null,null,0,5,10,15,20]),
    p('fsh', 'FSH', 'hormonal', 'lab', 'mUI/ml', 0.08, [11,10,8,6,2,0,null,null], [11,10,8,6,2,0,null,null]),
    p('prolactin', 'Prolactina', 'hormonal', 'lab', 'ng/ml', 0.09, [null,null,null,4,10,12,14,15], [null,null,null,4,10,12,14,15]),
  ]},
  { key: 'sleep', name: 'Sueño', weight: 0.10, parameters: [
    p('sleep_duration', 'Duración sueño', 'sleep', 'forms', 'hrs', 0.20, [10,9.5,9,8.5,7.5,7,6,5.5], [10,9.5,9,8.5,7.5,7,6,5.5]),
    p('sleep_consistency', 'Consistencia horario', 'sleep', 'forms', 'min var', 0.18, [null,null,null,5,30,60,90,105], [null,null,null,5,30,60,90,105]),
    p('wakeup_energy', 'Energía al despertar', 'sleep', 'forms', '/10', 0.15, [null,null,null,10,9,7,6,5], [null,null,null,10,9,7,6,5]),
    p('sleep_quality', 'Calidad sueño', 'sleep', 'forms', '/10', 0.15, [null,null,null,10,9,7,6,5], [null,null,null,10,9,7,6,5]),
    p('morning_sun', 'Sol matutino', 'sleep', 'forms', 'min', 0.12, [null,null,null,45,20,15,5,3], [null,null,null,45,20,15,5,3]),
    p('sleep_deep_pct', 'Deep %', 'sleep', 'wearable', '%', 0.10, [null,null,null,25,20,15,12,10], [null,null,null,25,20,15,12,10]),
    p('sleep_rem_pct', 'REM %', 'sleep', 'wearable', '%', 0.10, [null,null,null,27,22,18,15,12], [null,null,null,27,22,18,15,12]),
  ]},
  { key: 'habits', name: 'Hábitos', weight: 0.12, parameters: [
    p('exercise_weekly_hrs', 'Ejercicio hr/sem', 'habits', 'forms', 'hr', 0.20, [null,null,null,25,10,7,4,2], [null,null,null,25,10,7,4,2]),
    p('fasting_hours', 'Ayuno hr/día', 'habits', 'forms', 'hr', 0.12, [null,null,null,20,16,14,13,12], [null,null,null,20,16,14,13,12]),
    p('exercise_consistency', 'Consistencia', 'habits', 'forms', 'v/sem', 0.10, [null,null,null,7,5,3,2,1], [null,null,null,7,5,3,2,1]),
    p('alcohol_monthly', 'Alcohol mensual', 'habits', 'forms', 'copas', 0.10, [null,null,null,0,4,6,10,16], [null,null,null,0,4,6,10,16]),
    p('smoking_daily', 'Tabaquismo', 'habits', 'forms', 'cig/día', 0.10, [null,null,null,0,0,1,3,5], [null,null,null,0,0,1,3,5]),
    p('screen_hours', 'Pantallas hr/día', 'habits', 'forms', 'hr', 0.08, [null,null,null,0,2,3,4,5], [null,null,null,0,2,3,4,5]),
    p('daily_steps', 'Pasos/día', 'habits', 'wearable', 'pasos', 0.08, [null,null,null,15000,10000,7000,5000,3000], [null,null,null,15000,10000,7000,5000,3000]),
    p('sunlight_minutes', 'Luz natural min', 'habits', 'forms', 'min', 0.07, [null,null,null,45,20,15,5,0], [null,null,null,45,20,15,5,0]),
    p('conscious_breathing', 'Respiración min/d', 'habits', 'forms', 'min', 0.05, [null,null,null,20,10,5,2,0], [null,null,null,20,10,5,2,0]),
    p('chronic_meds', 'Fármacos crónicos', 'habits', 'forms', 'cant', 0.05, [null,null,null,0,0,1,2,3], [null,null,null,0,0,1,2,3]),
    p('water_liters', 'Agua litros/día', 'habits', 'forms', 'L', 0.05, [null,null,null,4,2.5,2,1.5,1], [null,null,null,4,2.5,2,1.5,1]),
  ]},
  { key: 'vitality', name: 'Vitalidad', weight: 0.10, parameters: [
    p('daily_energy', 'Energía diaria', 'vitality', 'forms', '/10', 0.15, [null,null,null,10,9,8,6,5], [null,null,null,10,9,8,6,5]),
    p('grip_strength', 'F. agarre', 'vitality', 'forms', 'kg', 0.15, [null,null,null,100,50,40,30,20], [null,null,null,100,50,40,30,20]),
    p('muscle_pct', 'Músculo %', 'vitality', 'forms', '%', 0.12, [null,null,null,65,40,35,30,25], [null,null,null,65,40,35,30,25]),
    p('vitamin_d', 'Vitamina D', 'vitality', 'lab', 'ng/ml', 0.10, [110,100,90,80,50,40,30,20], [110,100,90,80,50,40,30,20]),
    p('mental_clarity', 'Claridad mental', 'vitality', 'forms', '/10', 0.10, [null,null,null,10,9,8,6,5], [null,null,null,10,9,8,6,5]),
    p('motivation', 'Motivación', 'vitality', 'forms', '/10', 0.08, [null,null,null,10,9,8,6,5], [null,null,null,10,9,8,6,5]),
    p('resilience', 'Resiliencia', 'vitality', 'forms', '/10', 0.08, [null,null,null,10,9,8,6,5], [null,null,null,10,9,8,6,5]),
    p('vitamin_b12', 'B12', 'vitality', 'lab', 'pg/ml', 0.07, [1500,1200,1000,900,600,500,400,350], [1500,1200,1000,900,600,500,400,350]),
    p('magnesium', 'Magnesio', 'vitality', 'lab', 'mg/dl', 0.07, [3.3,3.2,2.8,2.6,2.2,2,1.8,1.6], [3.3,3.2,2.8,2.6,2.2,2,1.8,1.6]),
    p('chronic_fatigue', 'Fatiga crónica', 'vitality', 'forms', '/10', 0.08, [null,null,null,0,2,4,6,7], [null,null,null,0,2,4,6,7]),
  ]},
  { key: 'inflammation', name: 'Inflamación', weight: 0.08, parameters: [
    p('crp', 'PCR', 'inflammation', 'lab', 'mg/dl', 0.22, [null,null,null,0,0.2,0.4,0.6,0.7], [null,null,null,0,0.2,0.4,0.6,0.7]),
    p('homocysteine', 'Homocisteína', 'inflammation', 'lab', 'μmol/ml', 0.18, [null,null,null,0,8,9.5,11.5,11.6], [null,null,null,0,8,9.5,11.5,11.6]),
    p('vitamin_d_infl', 'Vitamina D', 'inflammation', 'lab', 'ng/ml', 0.15, [110,100,90,80,50,40,30,20], [110,100,90,80,50,40,30,20]),
    p('ferritin', 'Ferritina', 'inflammation', 'lab', 'ng/ml', 0.10, [400,300,200,150,50,20,10,5], [400,300,200,150,50,20,10,5]),
    p('uric_acid', 'Ác. úrico', 'inflammation', 'lab', 'mg/dl', 0.10, [8,7.5,6.5,5.5,3.5,3,null,null], [8,7.5,6.5,5.5,3.5,3,null,null]),
    p('ggt_infl', 'GGT', 'inflammation', 'lab', 'U/l', 0.10, [55,50,35,25,10,8,5,0], [55,50,35,25,10,8,5,0]),
    p('ldh', 'LDH', 'inflammation', 'lab', 'U/L', 0.08, [null,null,null,100,170,200,250,280], [null,null,null,100,170,200,250,280]),
    p('rheumatoid_factor', 'Factor reumatoide', 'inflammation', 'lab', 'UI/ml', 0.07, [25,20,15,10,1,0,null,null], [25,20,15,10,1,0,null,null]),
  ]},
  { key: 'body_composition', name: 'Composición corporal', weight: 0.08, parameters: [
    p('vo2_max', 'VO2 Max', 'body_composition', 'tests', 'ml/kg/min', 0.20, [null,null,null,100,50,42,36,30], [null,null,null,100,50,42,36,30]),
    p('body_fat_pct', '% grasa', 'body_composition', 'forms', '%', 0.20, [35,24,18,14,10,8,7,3], [35,24,18,14,10,8,7,3]),
    p('muscle_pct_bc', '% músculo', 'body_composition', 'forms', '%', 0.20, [null,null,null,55,46,44,42,40], [null,null,null,55,46,44,42,40]),
    p('grip_strength_bc', 'F. agarre', 'body_composition', 'forms', 'kg', 0.15, [null,null,null,100,50,45,40,35], [null,null,null,100,50,45,40,35]),
    p('visceral_fat', 'G. visceral', 'body_composition', 'forms', 'u', 0.12, [15,12,9,2,1,0,null,null], [15,12,9,2,1,0,null,null]),
    p('balance_test', 'Equilibrio', 'body_composition', 'tests', 'seg', 0.05, [null,null,null,60,30,20,10,7], [null,null,null,60,30,20,10,7]),
    p('pullups', 'Pull-ups', 'body_composition', 'tests', 'cant', 0.04, [null,null,null,50,15,10,6,3], [null,null,null,50,15,10,6,3]),
    p('pushups', 'Push-ups', 'body_composition', 'tests', 'cant', 0.04, [null,null,null,100,40,30,20,15], [null,null,null,100,40,30,20,15]),
  ]},
  { key: 'renal', name: 'Renal y Micronutrientes', weight: 0.07, parameters: [
    p('uric_acid_r', 'Ác. úrico', 'renal', 'lab', 'mg/dl', 0.12, [8,7.5,6.5,5.5,3.5,3,null,null], [8,7.5,6.5,5.5,3.5,3,null,null]),
    p('creatinine', 'Creatinina', 'renal', 'lab', 'mg/dl', 0.10, [1.4,1.3,1.2,1.1,0.8,0.7,null,null], [1.4,1.3,1.2,1.1,0.8,0.7,null,null]),
    p('ferritin_r', 'Ferritina', 'renal', 'lab', 'ng/ml', 0.10, [400,300,200,150,50,20,10,5], [400,300,200,150,50,20,10,5]),
    p('magnesium_r', 'Magnesio', 'renal', 'lab', 'mg/dl', 0.08, [3.3,3.2,2.8,2.6,2.2,2,1.8,1.6], [3.3,3.2,2.8,2.6,2.2,2,1.8,1.6]),
    p('iron_serum', 'Hierro sérico', 'renal', 'lab', 'μg/dl', 0.08, [190,180,160,140,80,70,60,50], [190,180,160,140,80,70,60,50]),
    p('vitamin_d_r', 'Vitamina D', 'renal', 'lab', 'ng/ml', 0.08, [110,100,90,80,50,40,30,20], [110,100,90,80,50,40,30,20]),
    p('vitamin_b12_r', 'B12', 'renal', 'lab', 'pg/ml', 0.08, [1500,1200,1000,900,600,500,400,350], [1500,1200,1000,900,600,500,400,350]),
    p('folate', 'Folato', 'renal', 'lab', 'ng/ml', 0.06, [25,24,20,18,10,8,6,5.5], [25,24,20,18,10,8,6,5.5]),
    p('bun', 'BUN', 'renal', 'lab', 'mg/dl', 0.06, [30,25,20,18,10,5,null,null], [30,25,20,18,10,5,null,null]),
    p('sodium', 'Sodio', 'renal', 'lab', 'mEq/L', 0.06, [160,150,145,142,138,135,130,125], [160,150,145,142,138,135,130,125]),
    p('potassium', 'Potasio', 'renal', 'lab', 'mEq/L', 0.06, [6,5.5,5,4.5,4,3.8,3.5,3.3], [6,5.5,5,4.5,4,3.8,3.5,3.3]),
    p('water_body_pct', 'Agua corporal %', 'renal', 'forms', '%', 0.06, [null,null,null,65,55,50,45,40], [null,null,null,60,50,45,40,35]),
    p('bun_creatinine', 'BUN/Creat', 'renal', 'calculation', 'Ratio', 0.06, [null,null,null,10,16,20,25,27], [null,null,null,10,16,20,25,27]),
  ]},
  { key: 'immunity', name: 'Inmunidad', weight: 0.06, parameters: [
    p('wbc', 'Leucocitos', 'immunity', 'lab', '/μL', 0.18, [12000,10000,9000,8000,5000,4500,4000,3000], [12000,10000,9000,8000,5000,4500,4000,3000]),
    p('crp_imm', 'PCR', 'immunity', 'lab', 'mg/dl', 0.15, [null,null,null,0,0.2,0.4,0.6,0.7], [null,null,null,0,0.2,0.4,0.6,0.7]),
    p('vitamin_d_imm', 'Vitamina D', 'immunity', 'lab', 'ng/ml', 0.12, [110,100,90,80,50,40,30,20], [110,100,90,80,50,40,30,20]),
    p('bilirubin_imm', 'Bilirrubina', 'immunity', 'lab', 'mg/dl', 0.12, [1.6,1.5,1.2,1,0.3,null,null,null], [1.6,1.5,1.2,1,0.3,null,null,null]),
    p('igg', 'IgG', 'immunity', 'lab', 'mg/dl', 0.10, [1401,1400,1300,1200,80,700,600,599], [1401,1400,1300,1200,80,700,600,599]),
    p('iga', 'IgA', 'immunity', 'lab', 'mg/dl', 0.08, [401,400,300,250,120,100,80,79], [401,400,300,250,120,100,80,79]),
    p('ige', 'IgE', 'immunity', 'lab', 'UI/ml', 0.08, [null,null,null,10,40,60,100,101], [null,null,null,10,40,60,100,101]),
    p('ldh_imm', 'LDH', 'immunity', 'lab', 'U/L', 0.07, [null,null,null,100,170,200,250,280], [null,null,null,100,170,200,250,280]),
    p('aso', 'ASO', 'immunity', 'lab', 'UI/ml', 0.10, [null,null,null,10,100,150,199,200], [null,null,null,10,100,150,199,200]),
  ]},
];

// === PHENOAGE DE LEVINE ===

const PHENO_COEFF = {
  albumin: -0.0336, creatinine: 0.0095, glucose: 0.1953, crp_ln: 0.0954,
  lymphocyte_pct: -0.0120, mcv: 0.0268, rdw: 0.3306, alp: 0.00188,
  wbc: 0.0554, age: 0.0804, intercept: -19.9067,
};

function calculatePhenoAge(
  labs: Record<string, number>, body: Record<string, number>, sex: Sex
): PhenoAgeResult {
  const age = labs.chronological_age || 40;
  const xb = PHENO_COEFF.intercept
    + PHENO_COEFF.albumin * ((labs.albumin || 4.2) * 10)
    + PHENO_COEFF.creatinine * ((labs.creatinine || 0.9) * 88.4)
    + PHENO_COEFF.glucose * ((labs.glucose || 90) * 0.0555)
    + PHENO_COEFF.crp_ln * Math.log(Math.max(0.001, labs.crp || 0.01))
    + PHENO_COEFF.lymphocyte_pct * (labs.lymphocyte_pct || 30)
    + PHENO_COEFF.mcv * (labs.mcv || 88)
    + PHENO_COEFF.rdw * (labs.rdw || 12.5)
    + PHENO_COEFF.alp * (labs.alp || 60)
    + PHENO_COEFF.wbc * ((labs.wbc || 6000) / 1000)
    + PHENO_COEFF.age * age;

  const mortScore = 1 - Math.exp(-Math.exp(xb) * ((Math.exp(0.0076927 * 120) - 1) / 0.0076927));
  const phenoAge = 141.50225 + (Math.log(-0.00553 * Math.log(1 - Math.min(mortScore, 0.9999))) / 0.090165);
  const bioCalc = phenoAge * 0.25 + age * 0.75;

  // Ajustes composición corporal
  const height_m = body.height_m || 1.75;
  const weight_kg = body.weight_kg || 80;
  const bfp = body.body_fat_pct || 20;
  const ffmi = (weight_kg * (1 - bfp / 100)) / (height_m * height_m);

  const vals = { visceral_fat: body.visceral_fat || 5, ffmi, grip_strength: body.grip_strength || 40, body_fat_pct: bfp / 100, muscle_pct: (body.muscle_pct || 35) / 100 };

  const rules = sex === 'male' ? [
    { c: (v: any) => v.visceral_fat > 10, i: 3, l: 'G.visc >10' },
    { c: (v: any) => v.visceral_fat < 5, i: -1, l: 'G.visc <5' },
    { c: (v: any) => v.ffmi > 21, i: -2, l: 'FFMI >21' },
    { c: (v: any) => v.ffmi < 17.5, i: 2, l: 'FFMI <17.5' },
    { c: (v: any) => v.grip_strength > 50, i: -2, l: 'Agarre >50' },
    { c: (v: any) => v.grip_strength < 40, i: 2, l: 'Agarre <40' },
    { c: (v: any) => v.body_fat_pct > 0.25, i: 2, l: 'Grasa >25%' },
    { c: (v: any) => v.body_fat_pct < 0.18, i: -1, l: 'Grasa <18%' },
    { c: (v: any) => v.muscle_pct > 0.42, i: -2, l: 'Músculo >42%' },
    { c: (v: any) => v.muscle_pct < 0.30, i: 2, l: 'Músculo <30%' },
  ] : [
    { c: (v: any) => v.visceral_fat > 7, i: 3, l: 'G.visc >7' },
    { c: (v: any) => v.visceral_fat < 4, i: -1, l: 'G.visc <4' },
    { c: (v: any) => v.ffmi > 18, i: -2, l: 'FFMI >18' },
    { c: (v: any) => v.ffmi < 15.5, i: 2, l: 'FFMI <15.5' },
    { c: (v: any) => v.grip_strength > 35, i: -2, l: 'Agarre >35' },
    { c: (v: any) => v.grip_strength < 27, i: 2, l: 'Agarre <27' },
    { c: (v: any) => v.body_fat_pct > 0.32, i: 2, l: 'Grasa >32%' },
    { c: (v: any) => v.body_fat_pct < 0.25, i: -1, l: 'Grasa <25%' },
    { c: (v: any) => v.muscle_pct > 0.38, i: -2, l: 'Músculo >38%' },
    { c: (v: any) => v.muscle_pct < 0.25, i: 2, l: 'Músculo <25%' },
  ];

  const adjs: { marker: string; impact: number }[] = [];
  let totalAdj = 0;
  for (const r of rules) { if (r.c(vals)) { adjs.push({ marker: r.l, impact: r.i }); totalAdj += r.i; } }

  const bioFinal = bioCalc + totalAdj;
  const agingRate = age > 0 ? (bioFinal / age) * 10 : 0;

  return { phenoAge, biologicalAgeFinal: bioFinal, mortScore, agingRate, adjustments: adjs };
}

// === MAIN CALCULATE ===

export function calculateHealthScore(
  inputValues: Record<string, number | null>,
  sex: Sex,
  chronologicalAge: number,
  bodyValues: { height_m: number; weight_kg: number; body_fat_pct: number; muscle_pct: number; visceral_fat: number; grip_strength: number }
): HealthScore {
  const domainResults: DomainResult[] = [];

  for (const domain of DOMAINS) {
    const paramResults: ParameterResult[] = [];
    let sumWS = 0, sumUW = 0, sumTW = 0;

    for (const param of domain.parameters) {
      const value = inputValues[param.key] ?? null;
      sumTW += param.weight;

      if (value === null || value === undefined) {
        paramResults.push({ key: param.key, name: param.name, value: null, unit: param.unit, rating: 'no_data', score: 0, weight: param.weight, weightedScore: 0 });
        continue;
      }

      const ranges = sex === 'male' ? param.ranges.male : param.ranges.female;
      const { rating, score } = rateValue(value, ranges);
      sumWS += score * param.weight;
      sumUW += param.weight;

      paramResults.push({ key: param.key, name: param.name, value, unit: param.unit, rating, score, weight: param.weight, weightedScore: score * param.weight });
    }

    domainResults.push({
      key: domain.key, name: domain.name,
      functionalScore: sumUW > 0 ? sumWS / sumUW : 0,
      evaluationQuality: sumTW > 0 ? sumUW / sumTW : 0,
      weight: domain.weight, parameters: paramResults,
    });
  }

  let globalSF = 0, globalCE = 0;
  for (const dr of domainResults) { globalSF += dr.functionalScore * dr.weight; globalCE += dr.evaluationQuality * dr.weight; }

  // PhenoAge
  let phenoAgeResult: PhenoAgeResult | null = null;
  const phenoKeys = ['albumin', 'creatinine', 'glucose_fasting', 'crp', 'wbc'];
  const available = phenoKeys.filter(k => inputValues[k] != null).length;
  if (available >= 3 && chronologicalAge > 0) {
    phenoAgeResult = calculatePhenoAge(
      { ...Object.fromEntries(Object.entries(inputValues).filter(([, v]) => v != null).map(([k, v]) => [k, v as number])), chronological_age: chronologicalAge },
      bodyValues,
      sex,
    );
  }

  return {
    functionalHealthScore: globalSF,
    evaluationQuality: globalCE * 100,
    biologicalAge: phenoAgeResult?.biologicalAgeFinal ?? 0,
    metabolicAge: 0,
    agingRate: phenoAgeResult?.agingRate ?? 0,
    domains: domainResults,
    phenoAge: phenoAgeResult,
  };
}

// === MAPEAR DATOS DEL PACIENTE ===

export function mapPatientDataToInput(
  labs: Record<string, any> | null,
  body: Record<string, any> | null,
  profile: Record<string, any> | null,
): Record<string, number | null> {
  const i: Record<string, number | null> = {};
  if (labs) {
    i['glucose_fasting'] = labs.glucose; i['hba1c'] = labs.hba1c; i['homa_ir'] = labs.homa_ir; i['insulin'] = labs.insulin;
    i['cholesterol_total'] = labs.cholesterol_total; i['hdl'] = labs.hdl; i['ldl'] = labs.ldl;
    i['triglycerides'] = labs.triglycerides; i['triglycerides_cv'] = labs.triglycerides;
    i['tsh'] = labs.tsh; i['t3_free'] = labs.t3_free; i['cortisol_am'] = labs.cortisol;
    i['testosterone_total'] = labs.testosterone; i['vitamin_d'] = labs.vitamin_d; i['vitamin_d_infl'] = labs.vitamin_d;
    i['vitamin_d_imm'] = labs.vitamin_d; i['vitamin_d_r'] = labs.vitamin_d;
    i['vitamin_b12'] = labs.vitamin_b12; i['vitamin_b12_r'] = labs.vitamin_b12;
    i['ferritin'] = labs.ferritin; i['ferritin_r'] = labs.ferritin; i['iron_serum'] = labs.iron;
    i['crp'] = labs.pcr; i['crp_imm'] = labs.pcr; i['homocysteine'] = labs.homocysteine;
    i['alt'] = labs.alt; i['ast'] = labs.ast; i['ggt'] = labs.ggt; i['ggt_infl'] = labs.ggt;
    i['creatinine'] = labs.creatinine; i['uric_acid'] = labs.uric_acid; i['uric_acid_r'] = labs.uric_acid;
    i['bun'] = labs.bun; i['hemoglobin'] = labs.hemoglobin; i['hematocrit'] = labs.hematocrit; i['wbc'] = labs.wbc;
    i['albumin'] = labs.albumin; i['alp'] = labs.alp; i['mcv'] = labs.mcv; i['rdw_cv'] = labs.rdw;
    i['lymphocyte_pct'] = labs.lymphocyte_pct; i['ldh'] = labs.ldh; i['ldh_imm'] = labs.ldh;
    i['bilirubin'] = labs.bilirubin; i['bilirubin_imm'] = labs.bilirubin;
    i['sodium'] = labs.sodium; i['potassium'] = labs.potassium; i['folate'] = labs.folate;
    i['vldl'] = labs.vldl; i['apo_b'] = labs.apo_b; i['aso'] = labs.aso;
    i['igg'] = labs.igg; i['iga'] = labs.iga; i['ige'] = labs.ige;
    i['rheumatoid_factor'] = labs.rheumatoid_factor;
    i['anti_tpo'] = labs.anti_tpo; i['anti_tg'] = labs.anti_tg;
    i['fsh'] = labs.fsh; i['prolactin'] = labs.prolactin;
    if (labs.triglycerides && labs.hdl) { i['tg_hdl_ratio'] = labs.triglycerides / labs.hdl; i['atherogenic_index'] = labs.cholesterol_total / labs.hdl; }
    if (labs.ldl && labs.hdl) i['ldl_hdl_ratio'] = labs.ldl / labs.hdl;
    if (labs.bun && labs.creatinine) i['bun_creatinine'] = labs.bun / labs.creatinine;
  }
  if (body) {
    i['body_fat_pct'] = body.body_fat_pct; i['muscle_pct'] = body.muscle_mass_pct; i['muscle_pct_bc'] = body.muscle_mass_pct;
    i['visceral_fat'] = body.visceral_fat; i['water_body_pct'] = body.body_water_pct; i['vo2_max'] = body.vo2_max;
  }
  if (profile) {
    i['grip_strength'] = profile.grip_strength_kg; i['grip_strength_bc'] = profile.grip_strength_kg;
    i['systolic_bp'] = profile.blood_pressure_sys; i['diastolic_bp'] = profile.blood_pressure_dia;
    i['vo2_estimated'] = profile.vo2_max; i['sleep_quality'] = profile.sleep_quality;
    i['meals_per_day'] = profile.meals_per_day; i['water_liters'] = profile.water_liters_day;
  }
  return i;
}

export const RATING_COLORS: Record<string, string> = {
  optimal: '#a8e02a',
  acceptable: '#EFD54F',
  risk: '#EF9F27',
  critical: '#E24B4A',
  out_of_range: '#E24B4A',
  no_data: '#444444',
};
