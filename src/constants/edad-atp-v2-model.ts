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
// PENDIENTE (requiere docs maestros ausentes — ver COWORK_REPORT):
//   - SF_DOMAIN_WEIGHTS: pesos de los 10 dominios (suman 1.0)
//   - SF_PARAMETER_RANGES: rangos de 9 bandas por parámetro
//   - BODY_COMP_ADJUSTMENT_RULES: reglas de ajuste por sexo (catálogo §3)
//   - SUB_EDAD_*_WEIGHTS: pesos de componentes por sub-edad (§4.x)
//   - RT norms Deary-Liewald (cognitivo) — aproximadas en su servicio
// ============================================================
