/**
 * SF 9-Band Service — Computa scores 0/25/50/80/100/80/50/25/0 con la matriz V7/V6.
 * Reemplaza el placeholder `sf_scores_by_domain = 50` por scoring real.
 *
 * Verificado contra paciente HOMBRES V7: SF=0.6083 con domain_scores reales del Excel.
 */
import { MATRIZ_HOMBRES, MATRIZ_MUJERES, SCORES_9, type MatrizParam, type MatrizSexo } from '@/src/constants/edad-atp-matriz-v7-v6';
import type { Sex, DomainKey } from '@/src/types/edad-atp-v2';

/**
 * Replica las bandas del Excel V7/V6 con su asimetría intencional de intervalos.
 * Limits = [P, Q, R, S, T, U, V, W] (8 valores frontera).
 * Asimetría: fronteras bajas son `[lo, hi)` y el óptimo (100) es cerrado en T (`[S, T]`).
 *
 * NOTA (desviación documentada del patch FIX_BANDS_EXCEL_LOGIC):
 *   El patch proponía "saltar V" (riesgo_4 50 cubriendo (U, W]). EMPÍRICAMENTE eso
 *   sobre-puntúa y da SF=0.641 (sobrepasa 0.6083). Con la banda critico_5 estándar
 *   (V < value <= W → 25) el gate del paciente HOMBRES V7 reproduce SF=0.6066 ≈ 0.6083 ± 0.005.
 *   Como el gate (output verificado del Excel) es la verdad de terreno, se usa V.
 *   Los 7 tests obligatorios (todos en bandas bajas/AC) pasan igual.
 */
export function score9Bands(value: number | null | undefined, bandLimits: (number | null)[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const [P, Q, R, S, T, U, V, W] = bandLimits;

  let total = 0;
  // X (score 0): value <= P
  if (P != null && value <= P) total += 0;
  // Y (score 25): P <= value < Q
  if (P != null && Q != null && value >= P && value < Q) total += 25;
  // Z (score 50): Q <= value < R
  if (Q != null && R != null && value >= Q && value < R) total += 50;
  // AA (score 80): R <= value < S
  if (R != null && S != null && value >= R && value < S) total += 80;
  // AB (score 100): S <= value <= T (intervalo cerrado en óptimo 2)
  if (S != null && T != null && value >= S && value <= T) total += 100;
  // AC (score 80): T < value <= U  (aceptable_3)
  if (T != null && U != null && value > T && value <= U) total += 80;
  // AD (score 50): U < value <= V  (riesgo_4)
  if (U != null && V != null && value > U && value <= V) total += 50;
  // AE (score 25): V < value <= W  (critico_5)
  if (V != null && W != null && value > V && value <= W) total += 25;
  // AF (score 0): value > W → contribuye 0

  return total;
}

/** Score de un dominio = Σ(score × peso) / Σ(peso presente). Retorna 0-100 + CE 0-1. */
export function scoreDomain(
  paramValues: Record<string, number | null | undefined>,
  domainParams: MatrizParam[],
): { score: number; ce: number; details: Array<{ key: string; value: number | null; score: number | null; weight: number; band: string | null }> } {
  let weightedSum = 0;
  let presentWeight = 0;
  let totalWeight = 0;
  const details = [];
  for (const p of domainParams) {
    totalWeight += p.weight;
    const v = paramValues[p.key];
    const s = score9Bands(v ?? null, p.bandLimits);
    let band: string | null = null;
    if (s != null) {
      band = ['critico_-5','riesgo_-4','aceptable_-3','optimo_1','optimo_2','aceptable_3','riesgo_4','critico_5','fuera_de_rango'][SCORES_9.indexOf(s as any)] ?? null;
      weightedSum += s * p.weight;
      presentWeight += p.weight;
    }
    details.push({ key: p.key, value: v ?? null, score: s, weight: p.weight, band });
  }
  return {
    score: presentWeight > 0 ? weightedSum / presentWeight : 0,
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    details,
  };
}

/** Selecciona la matriz por sexo. */
export function getMatriz(sex: Sex): MatrizSexo {
  return sex === 'female' ? MATRIZ_MUJERES : MATRIZ_HOMBRES;
}

/** Compute SF global 0-1 a partir de un dict de valores planos { param_key: value }. */
export function computeSFGlobalReal(
  paramValues: Record<string, number | null | undefined>,
  sex: Sex,
  domainWeights: Record<DomainKey, number>,
): { sf: number; ce_percent: number; domain_scores: Record<string, number>; domain_ce: Record<string, number> } {
  const matriz = getMatriz(sex);
  const domain_scores: Record<string, number> = {};
  const domain_ce: Record<string, number> = {};
  let weightedSum = 0;
  let presentWeight = 0;
  let totalWeight = 0;
  for (const [domKey, w] of Object.entries(domainWeights)) {
    totalWeight += w;
    const dom = matriz[domKey];
    if (!dom) continue;
    const { score, ce } = scoreDomain(paramValues, dom.params);
    domain_scores[domKey] = score;
    domain_ce[domKey] = ce;
    if (ce > 0) {
      weightedSum += score * w;
      presentWeight += w;
    }
  }
  return {
    sf: presentWeight > 0 ? (weightedSum / presentWeight) / 100 : 0,
    ce_percent: totalWeight > 0 ? (presentWeight / totalWeight) * 100 : 0,
    domain_scores,
    domain_ce,
  };
}
