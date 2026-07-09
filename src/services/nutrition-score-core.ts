/**
 * Score nutricional ATP — algoritmo puro (T3 Sprint NUTRICIÓN, #72).
 *
 * DETERMINÍSTICO (sin LLM). Dos modos (#52):
 *
 *   SIMPLE   → Proteína 40 · Hidratación 30 · Balance macros ATP 30
 *   COMPLETO → Proteína 25 · Hidratación 15 · Macros 20 · Micros 15 ·
 *              Timing 10 · Calidad 15
 *
 * Filosofía nutricional ATP (Mariana): macros por % de kcal en rangos
 * funcionales — carbos 0-25%, grasas 50-75%, proteína 20-35%. Proteína
 * target por peso corporal (1.6-2.2 g/kg, usamos punto medio 1.8).
 *
 * PURO: sin imports de RN/supabase — testeable en el harness node.
 */

export type NutritionMode = 'simple' | 'complete';

/** Rangos ATP de % de kcal por macro. */
export const ATP_MACRO_RANGES = {
  carbs: { min: 0, max: 25 },
  fat: { min: 50, max: 75 },
  protein: { min: 20, max: 35 },
} as const;

/** g/kg de proteína (punto medio del rango 1.6-2.2). */
export const PROTEIN_G_PER_KG = 1.8;
/** Peso fallback cuando el usuario no tiene medición (documentado en delivery). */
export const DEFAULT_WEIGHT_KG = 70;

/** Micros clave que el modo completo rastrea (v1 heurística por keywords). */
export const KEY_MICROS = ['vitamina_d', 'b12', 'magnesio', 'zinc'] as const;
export type KeyMicro = typeof KEY_MICROS[number];

export interface ScoreInputs {
  mode: NutritionMode;
  /** Peso para el target de proteína (null → DEFAULT_WEIGHT_KG). */
  weightKg: number | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  waterGoalMl: number;
  mealsLogged: number;
  /** COMPLETO: micros clave detectados hoy (subset de KEY_MICROS). */
  microsPresent?: KeyMicro[];
  /** COMPLETO: comidas dentro de la ventana de alimentación / total. */
  mealsInWindow?: number;
  /** COMPLETO: proporción whole-foods 0..1; null = sin dato (neutral). */
  qualityRatio?: number | null;
}

export interface ScoreBreakdown {
  total: number;             // 0-100 entero
  protein: number;           // puntos obtenidos por bloque
  hydration: number;
  macroBalance: number;
  micros: number | null;     // null en modo simple
  timing: number | null;
  quality: number | null;
  proteinTargetG: number;
  waterGoalMl: number;
  redFlags: string[];
  highlights: string[];
}

const WEIGHTS = {
  simple: { protein: 40, hydration: 30, macroBalance: 30 },
  complete: { protein: 25, hydration: 15, macroBalance: 20, micros: 15, timing: 10, quality: 15 },
} as const;

/** Target diario de proteína en gramos según peso. */
export function proteinTargetG(weightKg: number | null): number {
  const w = weightKg && Number.isFinite(weightKg) && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  return Math.round(w * PROTEIN_G_PER_KG);
}

/** % de kcal por macro (proteína/carbos 4 kcal/g, grasa 9 kcal/g). */
export function macroPercents(proteinG: number, carbsG: number, fatG: number): { protein: number; carbs: number; fat: number } | null {
  const kcal = proteinG * 4 + carbsG * 4 + fatG * 9;
  if (kcal <= 0) return null;
  return {
    protein: (proteinG * 4 / kcal) * 100,
    carbs: (carbsG * 4 / kcal) * 100,
    fat: (fatG * 9 / kcal) * 100,
  };
}

/** ¿Cuántos de los 3 macros caen dentro del rango ATP? (0-3). */
export function macrosInAtpRange(percents: { protein: number; carbs: number; fat: number }): number {
  let n = 0;
  if (percents.carbs >= ATP_MACRO_RANGES.carbs.min && percents.carbs <= ATP_MACRO_RANGES.carbs.max) n++;
  if (percents.fat >= ATP_MACRO_RANGES.fat.min && percents.fat <= ATP_MACRO_RANGES.fat.max) n++;
  if (percents.protein >= ATP_MACRO_RANGES.protein.min && percents.protein <= ATP_MACRO_RANGES.protein.max) n++;
  return n;
}

function ratio01(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

/**
 * Score del día. Reglas:
 *  - Proteína e hidratación: proporcionales al target (cap 100%).
 *  - Macros: cada macro dentro del rango ATP vale 1/3 del bloque; sin
 *    comidas registradas el bloque es 0 (no hay qué balancear).
 *  - Micros (completo): presentes/4 del bloque.
 *  - Timing (completo): comidas en ventana / total; sin comidas → 0.
 *  - Calidad (completo): proporcional al ratio whole-foods; SIN dato →
 *    mitad del bloque (neutral: no castiga la falta de parser).
 */
export function computeNutritionScore(inputs: ScoreInputs): ScoreBreakdown {
  const w = inputs.mode === 'complete' ? WEIGHTS.complete : WEIGHTS.simple;
  const target = proteinTargetG(inputs.weightKg);
  const redFlags: string[] = [];
  const highlights: string[] = [];

  // ── Proteína ──
  const proteinRatio = ratio01(inputs.proteinG, target);
  const proteinPts = proteinRatio * w.protein;
  if (proteinRatio >= 1) highlights.push('Proteína al 100%');
  else if (proteinRatio < 0.5 && inputs.mealsLogged > 0) redFlags.push('Proteína por debajo de la mitad del target');

  // ── Hidratación ──
  const waterRatio = ratio01(inputs.waterMl, inputs.waterGoalMl);
  const hydrationPts = waterRatio * w.hydration;
  if (waterRatio >= 1) highlights.push('Hidratación completa');
  else if (waterRatio < 0.5) redFlags.push('Hidratación por debajo de la mitad');

  // ── Balance macros ATP ──
  const percents = inputs.mealsLogged > 0
    ? macroPercents(inputs.proteinG, inputs.carbsG, inputs.fatG)
    : null;
  const inRange = percents ? macrosInAtpRange(percents) : 0;
  const macroPts = (inRange / 3) * w.macroBalance;
  if (percents && inRange === 3) highlights.push('Macros en rangos ATP');
  if (percents && percents.carbs > ATP_MACRO_RANGES.carbs.max) redFlags.push('Carbohidratos fuera del rango ATP (>25%)');
  if (inputs.mealsLogged === 0) redFlags.push('Sin comidas registradas');

  // ── Bloques del modo COMPLETO ──
  let microsPts: number | null = null;
  let timingPts: number | null = null;
  let qualityPts: number | null = null;

  if (inputs.mode === 'complete') {
    const cw = WEIGHTS.complete;
    const microsCount = (inputs.microsPresent ?? []).filter((m) => (KEY_MICROS as readonly string[]).includes(m)).length;
    microsPts = (microsCount / KEY_MICROS.length) * cw.micros;

    const mealsInWindow = inputs.mealsInWindow ?? 0;
    timingPts = inputs.mealsLogged > 0
      ? ratio01(mealsInWindow, inputs.mealsLogged) * cw.timing
      : 0;
    if (inputs.mealsLogged > 0 && mealsInWindow < inputs.mealsLogged) {
      redFlags.push('Comidas fuera de la ventana de alimentación');
    }

    if (inputs.qualityRatio == null) {
      qualityPts = cw.quality / 2; // neutral sin dato
    } else {
      qualityPts = Math.max(0, Math.min(1, inputs.qualityRatio)) * cw.quality;
      if (inputs.qualityRatio >= 0.8) highlights.push('Comida real, poco procesado');
      else if (inputs.qualityRatio < 0.4) redFlags.push('Predominio de procesados hoy');
    }
  }

  const total = Math.round(
    proteinPts + hydrationPts + macroPts + (microsPts ?? 0) + (timingPts ?? 0) + (qualityPts ?? 0),
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    protein: round1(proteinPts),
    hydration: round1(hydrationPts),
    macroBalance: round1(macroPts),
    micros: microsPts === null ? null : round1(microsPts),
    timing: timingPts === null ? null : round1(timingPts),
    quality: qualityPts === null ? null : round1(qualityPts),
    proteinTargetG: target,
    waterGoalMl: inputs.waterGoalMl,
    redFlags,
    highlights,
  };
}

/** Color del score (espejo de brand: rojo tenue <50, gris 50-69, lima 70+). */
export function scoreColor(score: number): string {
  if (score >= 70) return '#A8E02A';
  if (score >= 50) return '#888888';
  return '#fb7185';
}

/**
 * Detección heurística v1 de micros clave en descripciones de comida
 * (hasta que el parser LLM etiquete micros estructurados). Keywords es-MX.
 */
const MICRO_KEYWORDS: Record<KeyMicro, string[]> = {
  vitamina_d: ['salmón', 'salmon', 'atún', 'atun', 'sardina', 'huevo', 'yema', 'hígado', 'higado'],
  b12: ['res', 'carne', 'hígado', 'higado', 'huevo', 'pollo', 'pescado', 'atún', 'atun', 'salmón', 'salmon', 'sardina', 'queso'],
  magnesio: ['espinaca', 'aguacate', 'almendra', 'nuez', 'nueces', 'semilla', 'cacao', 'chocolate oscuro', 'frijol', 'lenteja'],
  zinc: ['res', 'carne', 'ostión', 'ostion', 'ostra', 'semilla de calabaza', 'pepita', 'garbanzo', 'queso'],
};

export function detectMicrosFromDescriptions(descriptions: string[]): KeyMicro[] {
  const text = descriptions.join(' ').toLowerCase();
  if (!text.trim()) return [];
  return KEY_MICROS.filter((micro) =>
    MICRO_KEYWORDS[micro].some((kw) => text.includes(kw)),
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── TIMING (modo completo) ─────────────────────────────────────────

import type { MealTimes } from '@/src/services/meal-times-core';

export interface LoggedMealTime {
  /** meal_type de food_logs (breakfast/lunch/... o valores libres). */
  mealType: string | null;
  /** meal_time HH:MM[:SS] de food_logs (null si no se capturó). */
  mealTime: string | null;
}

/** Tolerancia alrededor de la ventana configurada (min). */
export const MEAL_WINDOW_TOLERANCE_MIN = 60;

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return Number.isFinite(mins) ? mins : null;
}

/**
 * Cuenta cuántas comidas cayeron dentro de la ventana configurada para su
 * tipo (± tolerancia). Comidas sin hora o sin ventana configurada cuentan
 * como DENTRO (no castigamos data faltante — filosofía "brújula").
 */
export function mealsWithinWindows(meals: LoggedMealTime[], mealTimes: MealTimes): number {
  let inWindow = 0;
  for (const meal of meals) {
    const window = meal.mealType ? (mealTimes as Record<string, { start: string; end: string }>)[meal.mealType] : undefined;
    if (!window || !meal.mealTime) { inWindow++; continue; }
    const t = toMinutes(meal.mealTime);
    const start = toMinutes(window.start);
    const end = toMinutes(window.end);
    if (t === null || start === null || end === null) { inWindow++; continue; }
    if (t >= start - MEAL_WINDOW_TOLERANCE_MIN && t <= end + MEAL_WINDOW_TOLERANCE_MIN) inWindow++;
  }
  return inWindow;
}

/**
 * Ratio de calidad 0..1 desde los scores por comida disponibles (IA en
 * ai_analysis.score o quality_score del registro manual, ambos 0-100).
 * null si ninguna comida trae dato (el core lo trata neutral).
 */
export function qualityRatioFromMealScores(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter((s): s is number => Number.isFinite(s as number) && (s as number) >= 0);
  if (valid.length === 0) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.max(0, Math.min(1, avg / 100));
}
