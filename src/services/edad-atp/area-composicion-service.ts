/**
 * Motor v2 — ÁREA 2: COMPOSICIÓN CORPORAL (hoja `3_Area_Composicion`).
 * Score 0-100 por param con bandas por sexo (literatura + matriz V8) → promedio
 * ponderado → curva universal score→edad ciega.
 *
 * FFMI se calcula: peso × (1 − %grasa/100) / (altura_m)². No se toma del input.
 * Verificado contra los 4 fixtures: H1 56.5, H2 22.0, M1 22.0, M2 62.5.
 */
import { scoreToEdadCiega } from '@/src/constants/edad-atp-motor-v2-config';
import type { AreaCiegaResult, AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const WEIGHTS = { grasa: 0.2, ffmi: 0.2, musculo: 0.2, visceral: 0.15, agarre: 0.15, cintura: 0.1 };

function scoreGrasa(male: boolean, g: number): number {
  if (male) {
    if (g >= 10 && g <= 14) return 100;
    if (g >= 8 && g < 10) return 90;
    if (g > 14 && g <= 18.5) return 80;
    if (g > 18.5 && g <= 24) return 50;
    if (g > 24) return 25;
    if (g < 8) return 80;
    return 0;
  }
  if (g >= 18 && g <= 23) return 100;
  if (g >= 15 && g < 18) return 90;
  if (g > 23 && g <= 28) return 80;
  if (g > 28 && g <= 33) return 50;
  if (g > 33) return 25;
  if (g < 15) return 80;
  return 0;
}

function scoreFFMI(male: boolean, ffmi: number): number {
  if (male) {
    if (ffmi < 17.5) return 25;
    if (ffmi < 19) return 50;
    if (ffmi < 22) return 80;
    if (ffmi <= 25) return 100;
    return 80;
  }
  if (ffmi < 14) return 25;
  if (ffmi < 15.5) return 50;
  if (ffmi < 17) return 80;
  if (ffmi <= 19) return 100;
  return 80;
}

function scoreMusculo(male: boolean, m: number): number {
  if (male) {
    if (m >= 45) return 100;
    if (m >= 40) return 80;
    if (m >= 35) return 50;
    if (m >= 30) return 25;
    return 0;
  }
  if (m >= 35) return 100;
  if (m >= 32) return 80;
  if (m >= 28) return 50;
  if (m >= 25) return 25;
  return 0;
}

function scoreVisceral(male: boolean, v: number): number {
  if (male) {
    if (v < 5) return 100;
    if (v <= 7) return 80;
    if (v <= 10) return 50;
    if (v <= 12) return 25;
    return 0;
  }
  if (v < 4) return 100;
  if (v <= 6) return 80;
  if (v <= 8) return 50;
  if (v <= 10) return 25;
  return 0;
}

function scoreAgarre(male: boolean, a: number): number {
  if (male) {
    if (a > 55) return 100;
    if (a >= 45) return 80;
    if (a >= 35) return 50;
    if (a >= 25) return 25;
    return 0;
  }
  if (a > 35) return 100;
  if (a >= 28) return 80;
  if (a >= 22) return 50;
  if (a >= 18) return 25;
  return 0;
}

function scoreCintura(male: boolean, c: number): number {
  if (male) {
    if (c < 94) return 100;
    if (c <= 102) return 50;
    return 0;
  }
  if (c < 80) return 100;
  if (c <= 88) return 50;
  return 0;
}

/** FFMI = peso × (1 − %grasa/100) / (altura_m)². undefined si faltan peso/altura/grasa. */
export function computeFFMI(weight?: number, height?: number, bodyFat?: number): number | undefined {
  if (weight == null || height == null || bodyFat == null || height <= 0) return undefined;
  return (weight * (1 - bodyFat / 100)) / Math.pow(height / 100, 2);
}

export function computeAreaComposicion(input: MotorV2Input): AreaCiegaResult {
  const male = input.sex === 'male';
  const ffmi = computeFFMI(input.weight_kg, input.height_cm, input.body_fat_pct);

  const parts: Array<{ key: string; value: number | undefined; weight: number; score: number | null }> = [
    { key: 'grasa', value: input.body_fat_pct, weight: WEIGHTS.grasa, score: input.body_fat_pct != null ? scoreGrasa(male, input.body_fat_pct) : null },
    { key: 'ffmi', value: ffmi, weight: WEIGHTS.ffmi, score: ffmi != null ? scoreFFMI(male, ffmi) : null },
    { key: 'musculo', value: input.muscle_pct, weight: WEIGHTS.musculo, score: input.muscle_pct != null ? scoreMusculo(male, input.muscle_pct) : null },
    { key: 'visceral', value: input.visceral_fat, weight: WEIGHTS.visceral, score: input.visceral_fat != null ? scoreVisceral(male, input.visceral_fat) : null },
    { key: 'agarre', value: input.grip_strength_kg, weight: WEIGHTS.agarre, score: input.grip_strength_kg != null ? scoreAgarre(male, input.grip_strength_kg) : null },
    { key: 'cintura', value: input.waist_cm, weight: WEIGHTS.cintura, score: input.waist_cm != null ? scoreCintura(male, input.waist_cm) : null },
  ];

  let scoreTotal = 0;
  let presentWeight = 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const components: Record<string, AreaComponent> = {};
  for (const p of parts) {
    if (p.score != null) { scoreTotal += p.score * p.weight; presentWeight += p.weight; }
    components[p.key] = { value: p.value ?? null, score_0_100: p.score, weight: p.weight };
  }

  // Doctrina CE: renormalizar por peso presente. Un param sin captura BAJA el CE,
  // NUNCA cuenta como score 0 (el Excel siempre tiene celdas completas; runtime no).
  // Con datos completos presentWeight = 1.0 → gate intacto. Área vacía → neutra (= cron).
  const scoreNorm = presentWeight > 0 ? scoreTotal / presentWeight : 0;

  return {
    edad_ciega: presentWeight > 0 ? scoreToEdadCiega(scoreNorm) : input.chronological_age,
    score: scoreNorm,
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    components,
  };
}
