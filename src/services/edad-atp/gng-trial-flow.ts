/**
 * gng-trial-flow — lógica PURA del flujo de trials Go/No-Go y helpers del test de
 * Reaction Time (PRNG, outliers, schedule, tasa de errores). Sin react: testeable
 * con PRNG seeded.
 *
 * Fix B5 (smoke 2026-06-11): un trial NO-GO donde el usuario RETIENE correctamente
 * (no toca durante GNG_WITHHOLD_MS) registra "correct withhold" y el trial AVANZA
 * SOLO. Antes el trial se congelaba y obligaba a tocar = error forzado que
 * invalidaba el test. Trials GO sin cambio (el estímulo espera el tap).
 *
 * Tasa de errores (denominador consistente con el withhold automático): comisiones
 * sobre el TOTAL de trials presentados — ahora todos los trials completan
 * (hits + comisiones + retenciones correctas = trials).
 */

export const GNG_NOGO_RATIO = 0.25; // 25% de los estímulos son "no-go" (rojo = NO tocar)
export const GNG_WITHHOLD_MS = 1500; // retener este tiempo en NO-GO = correcto, avanza

/** PRNG mulberry32: determinista dado un seed, pero distinto cada sesión. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Promedio con filtro de outliers: descarta el 10% más lento (lapsos de atención). */
export function avgNoOutliers(a: number[]): number {
  if (!a.length) return 0;
  const sorted = [...a].sort((x, y) => x - y);
  const keep = Math.max(1, Math.ceil(sorted.length * 0.9));
  const kept = sorted.slice(0, keep);
  return Math.round(kept.reduce((s, x) => s + x, 0) / kept.length);
}

export type GngStimulus = 'go' | 'nogo';

/** Schedule completo de estímulos de una corrida, decidido con el PRNG de la sesión. */
export function buildGngSchedule(rand: () => number, trials: number, nogoRatio: number = GNG_NOGO_RATIO): GngStimulus[] {
  return Array.from({ length: trials }, () => (rand() < nogoRatio ? 'nogo' : 'go'));
}

/** % de errores de comisión sobre el total de trials presentados. */
export function gngErrorRatePct(commissions: number, trials: number): number {
  if (trials <= 0) return 0;
  return Math.round((commissions / trials) * 100);
}

export type GngResponse = { tap: boolean; rtMs?: number };
export type GngRunResult = {
  hits: number[];
  commissions: number;
  withholds: number;
  completedTrials: number;
  errorRatePct: number;
};

/**
 * Simula el flujo completo de una corrida — espejo 1:1 de la semántica de la pantalla:
 *   GO   + tap      → hit (registra rt)
 *   NOGO + tap      → error de comisión (avanza)
 *   NOGO + retener  → correct withhold (AVANZA SOLO — fix B5)
 * GO sin tap no ocurre en la UI: el estímulo espera el tap del usuario.
 */
export function runGngFlow(
  schedule: GngStimulus[],
  respond: (stimulus: GngStimulus, index: number) => GngResponse,
): GngRunResult {
  const hits: number[] = [];
  let commissions = 0;
  let withholds = 0;
  let completedTrials = 0;
  for (let i = 0; i < schedule.length; i++) {
    const s = schedule[i];
    const r = respond(s, i);
    if (s === 'go') hits.push(r.rtMs ?? 0);
    else if (r.tap) commissions += 1;
    else withholds += 1;
    completedTrials += 1; // TODO trial completa — nunca se congela
  }
  return { hits, commissions, withholds, completedTrials, errorRatePct: gngErrorRatePct(commissions, schedule.length) };
}
