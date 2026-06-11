/**
 * Motor v2 — MODULADOR HÁBITOS (hoja `7_Habitos_Modulador`).
 * Score 0-100 ponderado de 7 hábitos → factor multiplicador 0.95-1.10 aplicado a la
 * Edad ATP integral. El score se CALCULA aquí (no se toma del input "Score Hábitos
 * global", que en el Excel es sólo una estimación de referencia).
 *
 * Pesos: ayuno 0.10, ejercicio 0.20, pasos 0.10, tabaquismo 0.15, alcohol 0.10,
 * sueño duración 0.20, consistencia sueño 0.15.
 * Verificado contra los 4 fixtures: H1 factor 1.05, H2 0.95, M1 0.95, M2 1.05.
 */
import { getHabitosFactor } from '@/src/constants/edad-atp-motor-v2-config';
import type { AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const WEIGHTS = { ayuno: 0.1, ejercicio: 0.2, pasos: 0.1, tabaquismo: 0.15, alcohol: 0.1, sueno: 0.2, consistencia: 0.15 };

function scoreAyuno(h: number): number {
  return h < 12 ? 0 : h < 14 ? 25 : h < 16 ? 50 : h < 20 ? 100 : h < 23 ? 80 : 50;
}
function scoreEjercicio(h: number): number {
  return h < 2 ? 0 : h < 4 ? 25 : h < 7 ? 50 : h < 10 ? 80 : h < 25 ? 100 : 80;
}
function scorePasos(p: number): number {
  return p < 5000 ? 0 : p < 6500 ? 25 : p < 7800 ? 50 : p < 15000 ? 100 : p < 25000 ? 80 : 50;
}
function scoreTabaquismo(cig: number): number {
  return cig === 0 ? 100 : cig <= 5 ? 25 : 0;
}
function scoreAlcohol(m: number): number {
  return m <= 4 ? 100 : m <= 6 ? 80 : m <= 10 ? 50 : m <= 16 ? 25 : 0;
}
function scoreSueno(h: number): number {
  return h < 6 ? 0 : h < 7 ? 50 : h < 7.5 ? 80 : h <= 8.5 ? 100 : h <= 9.5 ? 80 : 50;
}
function scoreConsistencia(min: number): number {
  return min <= 45 ? 100 : min <= 75 ? 80 : min <= 90 ? 50 : 25;
}

export type HabitosResult = {
  score: number;
  factor: number;
  ce: number;
  components: Record<string, AreaComponent>;
};

export function computeHabitosModulador(input: MotorV2Input): HabitosResult {
  const parts: Array<{ key: string; value: number | undefined; weight: number; score: number | null }> = [
    { key: 'ayuno', value: input.ayuno_if_h, weight: WEIGHTS.ayuno, score: input.ayuno_if_h != null ? scoreAyuno(input.ayuno_if_h) : null },
    { key: 'ejercicio', value: input.ejercicio_h_sem, weight: WEIGHTS.ejercicio, score: input.ejercicio_h_sem != null ? scoreEjercicio(input.ejercicio_h_sem) : null },
    { key: 'pasos', value: input.pasos, weight: WEIGHTS.pasos, score: input.pasos != null ? scorePasos(input.pasos) : null },
    { key: 'tabaquismo', value: input.tabaquismo_cig, weight: WEIGHTS.tabaquismo, score: input.tabaquismo_cig != null ? scoreTabaquismo(input.tabaquismo_cig) : null },
    { key: 'alcohol', value: input.alcohol_mes, weight: WEIGHTS.alcohol, score: input.alcohol_mes != null ? scoreAlcohol(input.alcohol_mes) : null },
    { key: 'sueno', value: input.sueno_h, weight: WEIGHTS.sueno, score: input.sueno_h != null ? scoreSueno(input.sueno_h) : null },
    { key: 'consistencia', value: input.consistencia_sueno_min, weight: WEIGHTS.consistencia, score: input.consistencia_sueno_min != null ? scoreConsistencia(input.consistencia_sueno_min) : null },
  ];

  let score = 0;
  let presentWeight = 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const components: Record<string, AreaComponent> = {};
  for (const p of parts) {
    if (p.score != null) { score += p.score * p.weight; presentWeight += p.weight; }
    components[p.key] = { value: p.value ?? null, score_0_100: p.score, weight: p.weight };
  }
  // Si faltan hábitos, normaliza por el peso presente para no castigar de más (Excel
  // asume todos presentes; aquí degradamos suave). Con datos completos = SUMPRODUCT.
  const normScore = presentWeight > 0 ? score / presentWeight : 60; // 60 → factor neutral 1.0

  return {
    score: presentWeight === totalWeight ? score : normScore,
    factor: getHabitosFactor(presentWeight === totalWeight ? score : normScore),
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    components,
  };
}
