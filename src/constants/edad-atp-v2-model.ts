/**
 * Edad ATP v2 — constantes del modelo.
 * EDAD ATP Sprint 1/N (Foundations).
 *
 * NOTA DE ALCANCE: los coeficientes de PhenoAge (Levine 2018) y las constantes
 * del blend/ritmo/cognitivo son públicas/derivables y están VERIFICADAS contra
 * el paciente ejemplo HOMBRES V7. En cambio, los PESOS de dominios SF, los
 * RANGOS por parámetro y los PESOS de componentes de cada sub-edad provienen
 * del Excel maestro (docs EDAD_ATP_ARQUITECTURA_v2.md / _ALGORITMO_VERIFICADO_v1.md),
 * que NO están presentes en el repo. Esos quedan PENDIENTES (ver COWORK_REPORT).
 */

// ============================================================
// PhenoAge — Levine et al. 2018 ("An epigenetic biomarker of aging
// for lifespan and healthspan", Aging). Coeficientes del modelo de
// 10 términos (9 biomarcadores + edad cronológica).
// Verificado: reproducen xb=-9.158, MortScore=0.0206, PhenoAge=40.897
// para el paciente HOMBRES V7.
// ============================================================

export const PHENOAGE_INTERCEPT = -19.9067;

/** Coeficientes K_i, aplicados a los biomarcadores YA convertidos (ver phenoage-service). */
export const PHENOAGE_COEFFICIENTS = {
  albumin: -0.0336,      // g/L
  creatinine: 0.0095,    // μmol/L
  glucose: 0.1953,       // mmol/L
  ln_crp: 0.0954,        // ln(CRP mg/dL × 10)
  lymphocyte: -0.0120,   // %
  mcv: 0.0268,           // fL
  rdw: 0.3306,           // %
  alp: 0.00188,          // U/L
  wbc: 0.0554,           // 1000 cells/μL
  age: 0.0804,           // años
} as const;

/** Constante γ del modelo Gompertz para el Mort_Score y PhenoAge. */
export const PHENOAGE_GAMMA = 0.0076927;
export const PHENOAGE_T_MONTHS = 120; // ventana de mortalidad (meses) del modelo
export const PHENOAGE_A = 141.50225;
export const PHENOAGE_B = -0.00553;
export const PHENOAGE_C = 0.090165;

/** Conversiones de unidades a las que requiere la fórmula de PhenoAge. */
export const UNIT_CONVERSIONS = {
  albumin_g_dl_to_g_l: 10,        // g/dL × 10 = g/L
  creatinine_mg_dl_to_umol_l: 88.4, // mg/dL × 88.4 = μmol/L
  glucose_mg_dl_to_mmol_l: 0.0555, // mg/dL × 0.0555 = mmol/L
  wbc_per_ul_to_thousands: 1 / 1000, // /μL → 1000/μL
  crp_ln_multiplier: 10,           // ln(CRP_mg/dL × 10)  ← verificado vs Excel
} as const;

// ============================================================
// Blend final (Algoritmo Excel)
//   Algoritmo_Excel = (G36 × 0.75) + (PhenoAge × 0.25)
// ============================================================
export const BLEND_WEIGHT_ALGORITMO_EXCEL = 0.75;
export const BLEND_WEIGHT_PHENOAGE = 0.25;

// ============================================================
// Modificador cognitivo
//   modificador = clamp((EdadCognitiva − EdadCron) × 0.10, ±3)
// ============================================================
export const COGNITIVE_MODIFIER_WEIGHT = 0.10;
export const COGNITIVE_MODIFIER_CAP = 3;

// ============================================================
// Ritmo de envejecimiento
//   Ritmo = 12 + ((75 − SF×100) × EdadCron^0.75) / 100
// ============================================================
export const RITMO_THRESHOLD_SF = 75;
export const RITMO_BASE_MONTHS = 12;
export const RITMO_AGE_EXPONENT = 0.75;

// ============================================================
// SF — Salud Funcional (scoring 9 bandas)
// Scores por banda (orden: critico_-5, riesgo_-4, aceptable_-3, optimo_1,
// optimo_2, aceptable_3, riesgo_4, critico_5, fuera).
// ============================================================
export const SCORE_9_BANDS = [0, 25, 50, 80, 100, 80, 50, 25, 0] as const;

/**
 * Pesos de los 10 dominios SF (suman 1.0).
 * ⚠️ PLACEHOLDER: los pesos REALES del Excel (sección 6.x) NO están en los docs
 * maestros (ARQUITECTURA_v2 / ALGORITMO_VERIFICADO_v1). Con pesos iguales, los
 * scores del paciente HOMBRES V7 dan SF=0.6315 (no el verificado 0.6083).
 * → Pendiente: pesos de dominio reales para reproducir 0.6083 (ver COWORK_REPORT).
 */
export const SF_DOMAIN_WEIGHTS: Record<string, number> = {
  cardiovascular: 0.1,
  composicion_corporal: 0.1,
  habitos: 0.1,
  inflamacion: 0.1,
  inmunidad: 0.1,
  metabolismo: 0.1,
  renal_micronutrientes: 0.1,
  sistema_hormonal: 0.1,
  sueno: 0.1,
  vitalidad: 0.1,
};

// ============================================================
// Pesos de componentes por sub-edad (doc maestro ARQUITECTURA_v2 §4).
// ============================================================
export const SUB_EDAD_METABOLICA_WEIGHTS = {
  homa_ir: 0.20,
  hba1c: 0.25,
  trigs_hdl: 0.20,
  cgm_tir: 0.20,
  cintura: 0.15,
} as const;

export const SUB_EDAD_CORPORAL_WEIGHTS = {
  ffmi: 0.30,
  pct_grasa: 0.25,
  pct_musculo: 0.25,
  grasa_visceral: 0.20,
} as const;

export const SUB_EDAD_FITNESS_WEIGHTS = {
  vo2max: 0.35,
  grip: 0.25,
  push_ups: 0.15,
  resting_hr: 0.15,
  recovery_hr: 0.10,
} as const;

// ============================================================
// Ajustes composición corporal por sexo (catálogo §3 — ALGORITMO_VERIFICADO_v1).
// "Las fórmulas del catálogo mandan" (no los hardcoded H45:H49 del Excel).
// Cada factor: lista de reglas evaluadas en orden; primera que matchea gana.
// `match(value)` → impacto en años.
// ============================================================
export type BodyCompRule = { match: (v: number) => boolean; impact: number };

export const BODY_COMP_RULES_MALE: Record<keyof import('@/src/types/edad-atp-v2').EdadCorporalAdjustments, BodyCompRule[]> = {
  grasa_visceral: [
    { match: (v) => v < 5, impact: -1 },
    { match: (v) => v <= 10, impact: 0 },
    { match: (v) => v > 10, impact: 3 },
  ],
  ffmi: [
    { match: (v) => v < 17.5, impact: 2 },
    { match: (v) => v <= 21, impact: 0 },
    { match: (v) => v > 21, impact: -2 },
  ],
  fuerza_agarre: [
    { match: (v) => v < 40, impact: 2 },
    { match: (v) => v <= 50, impact: 0 },
    { match: (v) => v > 50, impact: -2 },
  ],
  pct_grasa: [
    { match: (v) => v > 25, impact: 2 },
    { match: (v) => v >= 10 && v <= 18, impact: -1 },
    { match: (v) => v <= 20, impact: 0 },
    { match: () => true, impact: 0 }, // 20–25%: sin regla → 0
  ],
  pct_musculo: [
    { match: (v) => v < 25, impact: 3 },
    { match: (v) => v < 30, impact: 2 },
    { match: (v) => v < 33, impact: 1 },
    { match: (v) => v > 45, impact: -3 },
    { match: (v) => v > 42, impact: -2 },
    { match: (v) => v > 38, impact: -1 },
    { match: () => true, impact: 0 }, // 33–38%: 0
  ],
};

export const BODY_COMP_RULES_FEMALE: Record<keyof import('@/src/types/edad-atp-v2').EdadCorporalAdjustments, BodyCompRule[]> = {
  grasa_visceral: [
    { match: (v) => v < 4, impact: -1 },
    { match: (v) => v <= 7, impact: 0 },
    { match: (v) => v > 7, impact: 3 },
  ],
  ffmi: [
    { match: (v) => v < 15.5, impact: 2 },
    { match: (v) => v <= 18, impact: 0 },
    { match: (v) => v > 18, impact: -2 },
  ],
  fuerza_agarre: [
    { match: (v) => v < 27, impact: 2 },
    { match: (v) => v <= 35, impact: 0 },
    { match: (v) => v > 35, impact: -2 },
  ],
  pct_grasa: [
    { match: (v) => v > 32, impact: 2 },
    { match: (v) => v >= 16 && v <= 25, impact: -1 },
    { match: (v) => v <= 28, impact: 0 },
    { match: () => true, impact: 0 }, // 28–32%: 0
  ],
  pct_musculo: [
    { match: (v) => v < 20, impact: 3 },
    { match: (v) => v < 25, impact: 2 },
    { match: (v) => v < 28, impact: 1 },
    { match: (v) => v > 38, impact: -2 },
    { match: (v) => v > 33, impact: -1 },
    { match: () => true, impact: 0 }, // 29–33%: 0
  ],
};

// ============================================================
// PENDIENTE (no están en los docs maestros — ver COWORK_REPORT):
//   - SF_DOMAIN_WEIGHTS reales (arriba es placeholder igual) → bloquea SF=0.6083 exacto.
//   - SF_PARAMETER_RANGES: rangos de 9 bandas por parámetro (los 140 inputs, sprint 5).
//   - Tablas norma score→edad de las sub-edades (solo hay pesos + "lookup públicos").
//   - RT norms Deary-Liewald (cognitivo) — aproximadas en su servicio.
// ============================================================
