/**
 * Utilidades compartidas de las sub-edades display.
 * EDAD ATP Sprint 1/N.
 *
 * Convención de score: 0-100, donde 50 = neutral (≈ edad cronológica), >50 más
 * joven, <50 más viejo. El mapeo score→edad usa una pendiente k años por punto.
 * // TODO Mariana Sprint 5: validar pendiente k y anchors por sexo/edad.
 */
import type { SubEdadResult } from '@/src/types/edad-atp-v2';

export const SCORE_TO_AGE_SLOPE = 0.4; // años por punto de score alrededor del neutral (50)
const AGE_MIN = 18;
const AGE_MAX = 100;

/** Mapea un score 0-100 a edad equivalente (50 = cronológica). */
export function scoreToEquivalentAge(score0100: number, chronologicalAge: number, slope = SCORE_TO_AGE_SLOPE): number {
  const age = chronologicalAge - (score0100 - 50) * slope;
  return Math.max(AGE_MIN, Math.min(AGE_MAX, age));
}

export type ComponentInput = {
  value: number | null | undefined;
  score_0_100: number | null; // null si missing
  weight: number;
};

/**
 * Agrega componentes (redistribuyendo el peso de los ausentes) y produce el
 * SubEdadResult con edad equivalente + CE (% de peso presente).
 */
export function buildSubEdadResult(
  components: Record<string, ComponentInput>,
  chronologicalAge: number,
): SubEdadResult {
  let weightedSum = 0;
  let presentWeight = 0;
  let totalWeight = 0;
  const outComponents: SubEdadResult['components'] = {};

  for (const [key, c] of Object.entries(components)) {
    totalWeight += c.weight;
    const missing = c.score_0_100 == null;
    if (!missing) {
      weightedSum += (c.score_0_100 as number) * c.weight;
      presentWeight += c.weight;
    }
    outComponents[key] = {
      value: c.value ?? 0,
      score_0_100: c.score_0_100 ?? 0,
      weight: c.weight,
      missing,
    };
  }

  const score = presentWeight > 0 ? weightedSum / presentWeight : 50;
  return {
    age_years: scoreToEquivalentAge(score, chronologicalAge),
    ce_percent: totalWeight > 0 ? (presentWeight / totalWeight) * 100 : 0,
    components: outComponents,
  };
}

/** Devuelve el score de la primera banda cuyo `test` matchea; default si ninguna. */
export function bandScore(value: number, bands: { test: (v: number) => boolean; score: number }[], fallback = 50): number {
  for (const b of bands) if (b.test(value)) return b.score;
  return fallback;
}
