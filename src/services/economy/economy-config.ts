/**
 * Config de la Economía Protones H+. Feature flag + constantes calibradas.
 *
 * Normalización 2026-06-22 (Enrique): equivalencia 1 H+ = $0.01 MXN (era $0.001).
 * Todos los montos divididos entre 10. Razón: los costos de acciones IA quedaban con
 * décimas (food_photo=24.5, insight=4.5...) con ×100; con ×10 todos enteros y legibles
 * sin perder granularidad para las acciones más baratas (insight=45 H+ vs 4.5).
 */
export const LAB_ECONOMY_ENABLED = true;

/** Conversión base: 100 E- = 300 H+ (3 H+/E-), ajustada por multiplier de reto en server. */
export const BASE_CONVERSION = { electrons: 100, protons: 300 } as const;

/** H+ por electrón en la tasa base (derivado). */
export const BASE_PROTONS_PER_ELECTRON = BASE_CONVERSION.protons / BASE_CONVERSION.electrons; // 3

// ── Montos calibrados (R and D/03_ECONOMIA_PROTONES_H_PLUS.md, normalizados /10) ──
/** Bono mensual de suscripción ($399 MXN bruto, $100 MXN valor nominal). NO acumula entre ciclos. */
export const SUBSCRIPTION_BONUS_PROTONS = 10_000;
/** Referral: H+ al referrer cuando su referido paga la primera sub. */
export const REFERRAL_REWARD_PROTONS = 20_000;
/** Referral: H+ bonus al referido al pagar su primera sub. */
export const REFERRED_BONUS_PROTONS = 5_000;

/** Acciones IA que cuestan H+ (deben existir en proton_action_costs / migración 086). */
export type ActionKey =
  | 'chat' | 'food_estimate_photo' | 'supplement_scan' | 'lab_interpretation'
  | 'routine' | 'food_estimate_text' | 'insight' | 'weekly_insight'
  | 'braverman_premium_report' | 'dx_generation' | 'bha_scan' | 'voice_turn';

/** Fallback de costos si la tabla no respondió (mismos números que el seed 086, normalizados /10). */
export const FALLBACK_ACTION_COSTS: Record<ActionKey, number> = {
  chat: 280,
  food_estimate_photo: 245,
  supplement_scan: 240,
  lab_interpretation: 165,
  routine: 165,
  food_estimate_text: 155,
  insight: 45,
  weekly_insight: 40,
  // #143: reportes premium — ancla doctrina H+ (seed en migración 162)
  braverman_premium_report: 1000,
  // DX+Intervenciones F2: síntesis "Mi Diagnóstico Funcional" (seed server-side)
  dx_generation: 1000,
  // Sprint SUPS+BHA: sello Biohacker Approved (seed 189 — precio cerrado 500)
  bha_scan: 500,
  // MB-4 J5: un turno de VOZ (STT Gemini + LLM + TTS ElevenLabs) es la interacción
  // más cara. Precio inicial = chat + prima de voz; Enrique calibra con la
  // telemetría (argos_logs) del día 1. Seed en migración 206.
  voice_turn: 400,
};
