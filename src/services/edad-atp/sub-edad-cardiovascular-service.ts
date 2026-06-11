/**
 * Sub-edad Cardiovascular DISPLAY — desde SF Cardiovascular de la matriz V7/V6.
 * Reemplaza el modelo ASCVD vanilla 2013 (AHA/ACC) por la matriz funcional propietaria.
 * 23 params del dominio Cardiovascular evaluados con scoring 9-band.
 *
 * Mapeo SF→edad: curva piecewise interim. TODO Mariana Sprint 5: validar con datos clínicos.
 */
import type { Sex, SubEdadResult } from '@/src/types/edad-atp-v2';
import { scoreDomain, getMatriz } from './sf-9band-service';

// Mantenido por compatibilidad de tipos (EdadAtpV2Inputs.cardiovascular.race) — ya no se usa.
export type Race = 'white' | 'african_american' | 'other';

/** Mapeo SF (0-100) → edad funcional (años). Curva piecewise relativa a la cronológica. */
export function sfToAge(sf_score: number, chronological_age: number): number {
  const points: [number, number][] = [
    [100, chronological_age * 0.55],
    [90, chronological_age * 0.75],
    [80, chronological_age * 0.95],
    [70, chronological_age * 1.15],
    [60, chronological_age * 1.40],
    [50, chronological_age * 1.70],
    [0, chronological_age * 2.0],
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const [s_hi, age_hi] = points[i];
    const [s_lo, age_lo] = points[i + 1];
    if (sf_score <= s_hi && sf_score >= s_lo) {
      const ratio = (s_hi - sf_score) / (s_hi - s_lo);
      return age_hi + ratio * (age_lo - age_hi);
    }
  }
  return chronological_age * 2.0;
}

export function computeEdadCardiovascular(params: {
  paramValues: Record<string, number | null | undefined>;
  sex: Sex;
  chronological_age: number;
}): SubEdadResult {
  const matriz = getMatriz(params.sex);
  const dom = matriz.cardiovascular;
  if (!dom) {
    return { age_years: params.chronological_age, ce_percent: 0, components: {} };
  }

  const { score: sf_cardio, ce, details } = scoreDomain(params.paramValues, dom.params);
  const age = sfToAge(sf_cardio, params.chronological_age);

  // Reconstruir components para drill-down (cada parámetro con su score + banda).
  const components: Record<string, { value: number; score_0_100: number; weight: number; missing: boolean; band?: string | null }> = {};
  for (const d of details) {
    components[d.key] = {
      value: d.value ?? 0,
      score_0_100: d.score ?? 0,
      weight: d.weight,
      missing: d.score === null,
      band: d.band,
    };
  }

  return { age_years: age, ce_percent: ce * 100, components };
}
