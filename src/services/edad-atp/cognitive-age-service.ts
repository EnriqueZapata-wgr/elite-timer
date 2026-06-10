/**
 * Edad Cognitiva + Modificador Cognitivo.
 * EDAD ATP Sprint 1/N.
 *
 * El MODIFICADOR es exacto (fórmula del doc maestro, verificable).
 * Las NORMAS de tiempo de reacción (Deary-Liewald) son APROXIMADAS — refinar
 * con Mariana en un sprint posterior (los valores exactos viven en el doc maestro
 * ausente; aquí se usan las aproximaciones del buzón).
 */
import type { Sex } from '@/src/types/edad-atp-v2';
import { COGNITIVE_MODIFIER_WEIGHT, COGNITIVE_MODIFIER_CAP } from '@/src/constants/edad-atp-v2-model';

// Normas RT (ms) por edad — recalibradas según Der & Deary 2006 (curva menos agresiva
// que la aproximación previa, que clavaba 60-75 años a adultos sanos).
const RT_SIMPLE_NORMS_MALE: Record<number, number> = { 20: 250, 30: 270, 40: 290, 50: 320, 60: 360, 70: 410, 80: 470 };
const RT_CHOICE_NORMS_MALE: Record<number, number> = { 20: 440, 30: 470, 40: 500, 50: 540, 60: 600, 70: 680, 80: 780 };
// Mujeres: ligera elevación (~7 ms) sobre las normas masculinas.
const FEMALE_OFFSET_MS = 7;

const RT_SIMPLE_WEIGHT = 0.4;
const RT_CHOICE_WEIGHT = 0.6;
const RT_AGE_MIN = 20;
const RT_AGE_MAX = 80;

function normsForSex(base: Record<number, number>, sex: Sex): Record<number, number> {
  if (sex === 'male') return base;
  const out: Record<number, number> = {};
  for (const [age, ms] of Object.entries(base)) out[Number(age)] = ms + FEMALE_OFFSET_MS;
  return out;
}

/**
 * Interpola inversamente RT → edad equivalente: encuentra la edad cuya norma de
 * RT coincide con el valor medido (interp lineal entre puntos). Fuera de rango,
 * clampa a [RT_AGE_MIN, RT_AGE_MAX].
 */
function rtToAge(rt: number, norms: Record<number, number>): number {
  const points = Object.entries(norms)
    .map(([age, ms]) => ({ age: Number(age), ms }))
    .sort((a, b) => a.ms - b.ms);

  if (rt <= points[0].ms) return RT_AGE_MIN;
  const last = points[points.length - 1];
  if (rt >= last.ms) return RT_AGE_MAX;

  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1];
    const hi = points[i];
    if (rt >= lo.ms && rt <= hi.ms) {
      const ratio = (rt - lo.ms) / (hi.ms - lo.ms);
      return lo.age + ratio * (hi.age - lo.age);
    }
  }
  return RT_AGE_MAX;
}

/**
 * Edad cognitiva equivalente a partir de RT simple + choice.
 * Pondera RT simple 40% + RT choice 60%.
 */
export function computeReactionTimeAge(params: {
  rt_simple_ms: number;
  rt_choice_ms: number;
  sex: Sex;
}): number {
  const simpleAge = rtToAge(params.rt_simple_ms, normsForSex(RT_SIMPLE_NORMS_MALE, params.sex));
  const choiceAge = rtToAge(params.rt_choice_ms, normsForSex(RT_CHOICE_NORMS_MALE, params.sex));
  return RT_SIMPLE_WEIGHT * simpleAge + RT_CHOICE_WEIGHT * choiceAge;
}

/**
 * Modificador cognitivo: clamp((EdadCognitiva − EdadCron) × 0.10, ±3).
 * Verificable (fórmula exacta del doc maestro).
 */
export function computeCognitiveModifier(params: {
  edad_cognitiva: number;
  chronological_age: number;
}): {
  modificador: number;
  delta: number;
  capped: boolean;
} {
  const delta = params.edad_cognitiva - params.chronological_age;
  const raw = delta * COGNITIVE_MODIFIER_WEIGHT;
  const modificador = Math.max(-COGNITIVE_MODIFIER_CAP, Math.min(COGNITIVE_MODIFIER_CAP, raw));
  const capped = Math.abs(raw) > COGNITIVE_MODIFIER_CAP;
  return { modificador, delta, capped };
}
