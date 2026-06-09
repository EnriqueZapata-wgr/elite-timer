/**
 * SF 9-Band Service — Computa scores 0/25/50/80/100/80/50/25/0 con la matriz V7/V6.
 * Reemplaza el placeholder `sf_scores_by_domain = 50` por scoring real.
 *
 * Verificado contra paciente HOMBRES V7: SF=0.6083 con domain_scores reales del Excel.
 */
import { MATRIZ_HOMBRES, MATRIZ_MUJERES, SCORES_9, type MatrizParam, type MatrizSexo } from '@/src/constants/edad-atp-matriz-v7-v6';
import type { Sex, DomainKey } from '@/src/types/edad-atp-v2';

/** Mapea un valor a su score 0-100 con bandas de 8 límites superiores. */
export function score9Bands(value: number | null | undefined, bandLimits: (number | null)[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  for (let i = 0; i < bandLimits.length; i++) {
    const lim = bandLimits[i];
    if (lim == null) continue;
    if (value <= lim) return SCORES_9[i];
  }
  return SCORES_9[8];
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
