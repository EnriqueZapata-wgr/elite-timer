/**
 * Motor v2 — ÁREA 4: COGNICIÓN (hoja `5_Area_Cognicion`).
 * Curvas Der & Deary 2006 para RT Simple y Choice, Go/No-Go (RT + modificador por % de
 * errores), y subjetivos (claridad/energía/memoria). Cada test → edad parcial; el área
 * es el PROMEDIO PONDERADO de las 4 edades (NO pasa por la curva universal score→edad).
 *
 * Pesos: simple 0.30, choice 0.30, go/no-go 0.25, subjetivos 0.15.
 * Verificado contra los 4 fixtures: H1 45.08, H2 22.27, M1 33.2, M2 69.4.
 */
import type { AreaCiegaResult, AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const WEIGHTS = { simple: 0.3, choice: 0.3, go_no_go: 0.25, subjetivos: 0.15 };

/** Interpolación lineal piecewise: edad por tramos de RT (ms). Cada tramo [a,b]→[ageA,ageB]. */
function piecewise(rt: number, pts: Array<[number, number]>, tailStep: number): number {
  const [firstRt, firstAge] = pts[0];
  if (rt <= firstRt) return firstAge;
  for (let i = 1; i < pts.length; i++) {
    const [r0, a0] = pts[i - 1];
    const [r1, a1] = pts[i];
    if (rt <= r1) return a0 + ((rt - r0) / (r1 - r0)) * (a1 - a0);
  }
  const [lastRt, lastAge] = pts[pts.length - 1];
  return Math.min(100, lastAge + ((rt - lastRt) / tailStep) * 10);
}

/** Simple RT → edad (Der & Deary 2006). */
export function rtSimpleToAge(rt: number): number {
  return piecewise(rt, [[250, 20], [270, 30], [290, 40], [320, 50], [360, 60], [410, 70], [470, 80]], 30);
}
/** Choice RT 4-AFC → edad (Der & Deary 2006). */
export function rtChoiceToAge(rt: number): number {
  return piecewise(rt, [[440, 20], [470, 30], [500, 40], [540, 50], [600, 60], [680, 70], [780, 80]], 50);
}
/** Go/No-Go: edad por RT de hits + modificador por % de errores. */
export function goNoGoToAge(rt: number, errPct: number): number {
  const rtAge = piecewise(rt, [[280, 20], [310, 30], [340, 40], [380, 50], [430, 60], [490, 70], [560, 80]], 40);
  const errMod = errPct < 5 ? 0 : errPct < 10 ? 2 : errPct < 20 ? 5 : 10;
  return rtAge + errMod;
}
/** Subjetivos: cron + (7 − promedio(claridad,energía,memoria)) × 5. */
export function subjetivosToAge(avg: number, cron: number): number {
  return cron + (7 - avg) * 5;
}

export function computeAreaCognicion(input: MotorV2Input): AreaCiegaResult {
  const cron = input.chronological_age;
  const parts: Array<{ key: string; value: number | null; weight: number; age: number | null }> = [];

  const simpleAge = input.rt_simple_ms != null ? rtSimpleToAge(input.rt_simple_ms) : null;
  parts.push({ key: 'rt_simple', value: input.rt_simple_ms ?? null, weight: WEIGHTS.simple, age: simpleAge });

  const choiceAge = input.rt_choice_ms != null ? rtChoiceToAge(input.rt_choice_ms) : null;
  parts.push({ key: 'rt_choice', value: input.rt_choice_ms ?? null, weight: WEIGHTS.choice, age: choiceAge });

  const gngAge = input.go_no_go_rt_hits_ms != null && input.go_no_go_error_pct != null
    ? goNoGoToAge(input.go_no_go_rt_hits_ms, input.go_no_go_error_pct) : null;
  parts.push({ key: 'go_no_go', value: input.go_no_go_rt_hits_ms ?? null, weight: WEIGHTS.go_no_go, age: gngAge });

  const subjVals = [input.mental_clarity, input.mental_energy, input.memory_self].filter((x): x is number => x != null);
  const subjAge = subjVals.length === 3 ? subjetivosToAge((subjVals[0] + subjVals[1] + subjVals[2]) / 3, cron) : null;
  const subjAvg = subjVals.length === 3 ? (subjVals[0] + subjVals[1] + subjVals[2]) / 3 : null;
  parts.push({ key: 'subjetivos', value: subjAvg, weight: WEIGHTS.subjetivos, age: subjAge });

  // Promedio ponderado de las edades parciales presentes (SUMPRODUCT del Excel).
  let weightedAge = 0;
  let presentWeight = 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const components: Record<string, AreaComponent> = {};
  for (const p of parts) {
    if (p.age != null) { weightedAge += p.age * p.weight; presentWeight += p.weight; }
    // El "score" del componente es la edad parcial (no 0-100) — útil para drill-down.
    components[p.key] = { value: p.value, score_0_100: p.age, weight: p.weight };
  }

  return {
    edad_ciega: presentWeight > 0 ? weightedAge / presentWeight : cron,
    score: null, // cognición promedia edades, no scores 0-100
    ce: totalWeight > 0 ? presentWeight / totalWeight : 0,
    components,
  };
}
