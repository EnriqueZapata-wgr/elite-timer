/**
 * Motor v2 — ÁREA 4: COGNICIÓN (hoja `5_Area_Cognicion`). Recalibrada en v2.1 (smoke
 * real de Enrique: cron 35, RTs excelentes salía cognición 36.3).
 * Curvas Der & Deary 2006 para RT Simple y Choice, Go/No-Go (RT + modificador por % de
 * errores), y subjetivos (claridad/energía/memoria). Cada test → edad parcial; el área
 * es el PROMEDIO PONDERADO de las 4 edades (NO pasa por la curva universal score→edad).
 *
 * v2.1 (3 fixes):
 *  1. Subjetivos simétricos en escala 0-10 (neutro en 5, ±3.5, rejuvenece y envejece).
 *  2. Latencia táctil: se RESTA RT_TOUCH_LATENCY_MS al RT medido antes de cada curva
 *     (las curvas son de botón físico; la pantalla añade ~80 ms).
 *  3. Go/No-Go: castigo por error de comisión sensible (~0.7 año/punto%, techo 15).
 *
 * Pesos: simple 0.30, choice 0.30, go/no-go 0.25, subjetivos 0.15.
 * Pendiente Mariana (follow-up, NO en v2.1): aplanar la pendiente RT 30-50.
 */
import { RT_TOUCH_LATENCY_MS } from '@/src/constants/edad-atp-motor-v2-config';
import type { AreaCiegaResult, AreaComponent, MotorV2Input } from '@/src/types/motor-edad-atp-v2';

const WEIGHTS = { simple: 0.3, choice: 0.3, go_no_go: 0.25, subjetivos: 0.15 };

/** Resta la latencia táctil al RT medido (nunca negativo) antes de mapear a edad. */
function deTouch(rt: number): number {
  return Math.max(0, rt - RT_TOUCH_LATENCY_MS);
}

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
/**
 * Go/No-Go: edad por RT de hits + modificador por % de errores de comisión.
 * v2.1: el castigo es sensible y monótono (~0.7 año por punto% de error, techo 15)
 * porque en un Go/No-Go real la inhibición es la medida principal, no nota al pie.
 * (1 error en 20 = 5% → +3.5 años; 4 errores = 20% → +14).
 */
export function goNoGoToAge(rt: number, errPct: number): number {
  const rtAge = piecewise(rt, [[280, 20], [310, 30], [340, 40], [380, 50], [430, 60], [490, 70], [560, 80]], 40);
  const errMod = Math.min(15, Math.max(0, errPct) * 0.7);
  return rtAge + errMod;
}
/**
 * Subjetivos v2.1 — escala 0-10, neutro en 5, simétrico y acotado ±3.5:
 *   10/10 → cron − 3.5 (rejuvenece) · 5/10 → cron · 0/10 → cron + 3.5.
 * avg10 = promedio de claridad/energía/memoria, cada uno en 0-10. La versión vieja
 * (`cron + (7 − avg) × 5`) usaba neutro en 7 y solo envejecía; además la UI capturaba
 * en 1-7 → discordancia de escala que envejecía a Enrique +6.65 años.
 */
export function subjetivosToAge(avg10: number, cron: number): number {
  return cron - (avg10 - 5) * 0.7;
}

export function computeAreaCognicion(input: MotorV2Input): AreaCiegaResult {
  const cron = input.chronological_age;
  const parts: Array<{ key: string; value: number | null; weight: number; age: number | null }> = [];

  // v2.1: se resta la latencia táctil al RT crudo antes de cada curva (botón físico).
  const simpleAge = input.rt_simple_ms != null ? rtSimpleToAge(deTouch(input.rt_simple_ms)) : null;
  parts.push({ key: 'rt_simple', value: input.rt_simple_ms ?? null, weight: WEIGHTS.simple, age: simpleAge });

  const choiceAge = input.rt_choice_ms != null ? rtChoiceToAge(deTouch(input.rt_choice_ms)) : null;
  parts.push({ key: 'rt_choice', value: input.rt_choice_ms ?? null, weight: WEIGHTS.choice, age: choiceAge });

  const gngAge = input.go_no_go_rt_hits_ms != null && input.go_no_go_error_pct != null
    ? goNoGoToAge(deTouch(input.go_no_go_rt_hits_ms), input.go_no_go_error_pct) : null;
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
