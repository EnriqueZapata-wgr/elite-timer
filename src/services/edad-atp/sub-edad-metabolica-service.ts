/**
 * Sub-edad Metabólica DISPLAY — desde SF del dominio `metabolismo` de la matriz V7/V6.
 * Reemplaza las curvas inventadas por scoring 9-band real. Mapeo SF→edad piecewise.
 * TODO Mariana Sprint 5: validar curva con datos clínicos.
 */
import type { Sex, SubEdadResult } from '@/src/types/edad-atp-v2';
import { scoreDomain, getMatriz } from './sf-9band-service';
import { sfToAge } from './sub-edad-cardiovascular-service';

export function computeEdadMetabolica(params: {
  paramValues: Record<string, number | null | undefined>;
  sex: Sex;
  chronological_age: number;
}): SubEdadResult {
  const dom = getMatriz(params.sex).metabolismo;
  if (!dom) return { age_years: params.chronological_age, ce_percent: 0, components: {} };
  const { score, ce, details } = scoreDomain(params.paramValues, dom.params);
  const components: Record<string, { value: number; score_0_100: number; weight: number; missing: boolean; band?: string | null }> = {};
  for (const d of details) {
    components[d.key] = { value: d.value ?? 0, score_0_100: d.score ?? 0, weight: d.weight, missing: d.score === null, band: d.band };
  }
  return { age_years: sfToAge(score, params.chronological_age), ce_percent: ce * 100, components };
}
