/**
 * Config de la Economía Protones H+. Feature flag + constantes calibradas.
 *
 * ⚠️ FEATURE OFF POR DEFAULT (decisión Enrique). Mientras `LAB_ECONOMY_ENABLED = false`:
 * el header HOY no muestra E-/H+, el proxy NO descuenta H+, y las pantallas /economy/*
 * quedan accesibles solo para QA pero sin gatear acciones. Enrique lo activa tras validar.
 */
export const LAB_ECONOMY_ENABLED = false;

/** Conversión base: 100 E- = 3,000 H+ (30 H+/E-), ajustada por multiplier de reto en server. */
export const BASE_CONVERSION = { electrons: 100, protons: 3000 } as const;

/** H+ por electrón en la tasa base (derivado). */
export const BASE_PROTONS_PER_ELECTRON = BASE_CONVERSION.protons / BASE_CONVERSION.electrons; // 30

/** Acciones IA que cuestan H+ (deben existir en proton_action_costs / migración 086). */
export type ActionKey =
  | 'chat' | 'food_estimate_photo' | 'supplement_scan' | 'lab_interpretation'
  | 'routine' | 'food_estimate_text' | 'insight' | 'weekly_insight';

/** Fallback de costos si la tabla no respondió (mismos números que el seed 086). */
export const FALLBACK_ACTION_COSTS: Record<ActionKey, number> = {
  chat: 2800,
  food_estimate_photo: 2450,
  supplement_scan: 2400,
  lab_interpretation: 1650,
  routine: 1650,
  food_estimate_text: 1550,
  insight: 450,
  weekly_insight: 400,
};
