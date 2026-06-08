/**
 * Ajustes de composición corporal (años) por sexo — catálogo §3.
 * EDAD ATP Sprint 1/N.
 *
 * "Las fórmulas del catálogo mandan" (no los hardcoded H45:H49 del Excel, que
 * tenían errores). Para el paciente HOMBRES V7 esto da total = −2 (no −1).
 */
import type { BodyComposition, EdadCorporalAdjustments, Sex } from '@/src/types/edad-atp-v2';
import {
  BODY_COMP_RULES_MALE,
  BODY_COMP_RULES_FEMALE,
  type BodyCompRule,
} from '@/src/constants/edad-atp-v2-model';

/** Normaliza un porcentaje a 0-100 (acepta fracción 0-1 o porcentaje 0-100). */
function toPercent(v: number): number {
  return v <= 1 ? v * 100 : v;
}

/** FFMI = masa libre de grasa / talla². */
export function computeFFMI(comp: BodyComposition): number {
  if (comp.ffmi != null && Number.isFinite(comp.ffmi)) return comp.ffmi;
  const fatFraction = toPercent(comp.body_fat_pct) / 100;
  const leanMass = comp.weight_kg * (1 - fatFraction);
  const heightM = comp.height_cm / 100;
  return leanMass / (heightM * heightM);
}

function applyRules(value: number, rules: BodyCompRule[]): number {
  for (const r of rules) if (r.match(value)) return r.impact;
  return 0;
}

/**
 * Calcula los 5 ajustes de composición + su suma total (años).
 */
export function computeBodyCompositionAdjustments(
  comp: BodyComposition,
  sex: Sex,
): { adjustments: EdadCorporalAdjustments; total_adjustment_years: number } {
  const rules = sex === 'male' ? BODY_COMP_RULES_MALE : BODY_COMP_RULES_FEMALE;
  const ffmi = computeFFMI(comp);

  const adjustments: EdadCorporalAdjustments = {
    grasa_visceral: applyRules(comp.visceral_fat, rules.grasa_visceral),
    ffmi: applyRules(ffmi, rules.ffmi),
    fuerza_agarre: comp.grip_strength_kg != null ? applyRules(comp.grip_strength_kg, rules.fuerza_agarre) : 0,
    pct_grasa: applyRules(toPercent(comp.body_fat_pct), rules.pct_grasa),
    pct_musculo: applyRules(toPercent(comp.skeletal_muscle_pct), rules.pct_musculo),
  };

  const total_adjustment_years =
    adjustments.grasa_visceral +
    adjustments.ffmi +
    adjustments.fuerza_agarre +
    adjustments.pct_grasa +
    adjustments.pct_musculo;

  return { adjustments, total_adjustment_years };
}
