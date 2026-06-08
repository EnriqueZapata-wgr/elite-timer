/**
 * Salud Funcional (SF) — scoring de 10 dominios con bandas de 9 niveles.
 * EDAD ATP Sprint 1/N.
 *
 * SF global = Σ(score_dominio × peso_dominio) / 100  → 0-1.
 *
 * ⚠️ Los PESOS de dominio reales del Excel NO están en los docs maestros; aquí
 * se usa un placeholder de pesos iguales (ver SF_DOMAIN_WEIGHTS). Con eso, el
 * paciente HOMBRES V7 da SF=0.6315 en vez del verificado 0.6083. El mecanismo
 * de cálculo es correcto; solo faltan los pesos reales (ver COWORK_REPORT).
 */
import type { DomainKey } from '@/src/types/edad-atp-v2';
import { SCORE_9_BANDS, SF_DOMAIN_WEIGHTS } from '@/src/constants/edad-atp-v2-model';

/**
 * Score 9 bandas para un parámetro. `thresholds` = 8 fronteras ascendentes que
 * definen las 9 bandas; devuelve el score (0/25/50/80/100/80/50/25/0).
 */
export function score9Bands(value: number, thresholds: number[]): number {
  if (thresholds.length !== 8) {
    throw new Error('sf-service: score9Bands requiere 8 fronteras (9 bandas).');
  }
  let band = 0;
  while (band < thresholds.length && value >= thresholds[band]) band++;
  return SCORE_9_BANDS[band];
}

/** Score de dominio = promedio ponderado de scores de parámetros presentes (0-100). */
export function computeDomainScore(
  paramScores: Record<string, number | null | undefined>,
  paramWeights: Record<string, number>,
): { score: number; ce_percent: number } {
  let weightedSum = 0;
  let presentWeight = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(paramWeights)) {
    totalWeight += weight;
    const s = paramScores[key];
    if (s != null && Number.isFinite(s)) {
      weightedSum += s * weight;
      presentWeight += weight;
    }
  }
  const score = presentWeight > 0 ? weightedSum / presentWeight : 0;
  const ce_percent = totalWeight > 0 ? (presentWeight / totalWeight) * 100 : 0;
  return { score, ce_percent };
}

/**
 * SF global a partir de los 10 scores de dominio (0-100). Redistribuye el peso
 * de los dominios ausentes. Devuelve SF 0-1 + CE (% de dominios presentes).
 */
export function computeSFGlobal(
  domainScores: Partial<Record<DomainKey, number | null>>,
  weights: Record<string, number> = SF_DOMAIN_WEIGHTS,
): { sf: number; ce_percent: number } {
  let weightedSum = 0;
  let presentWeight = 0;
  let totalWeight = 0;
  for (const [domain, weight] of Object.entries(weights)) {
    totalWeight += weight;
    const s = domainScores[domain as DomainKey];
    if (s != null && Number.isFinite(s)) {
      weightedSum += s * weight;
      presentWeight += weight;
    }
  }
  const scoreOn100 = presentWeight > 0 ? weightedSum / presentWeight : 0;
  return {
    sf: scoreOn100 / 100,
    ce_percent: totalWeight > 0 ? (presentWeight / totalWeight) * 100 : 0,
  };
}
