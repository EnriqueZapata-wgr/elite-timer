/**
 * Dual N-Back — motor PURO (testeable en vitest, sin RN/supabase).
 *
 * Fuentes reconciliadas (SPEC_NBACK_MODULO 2026-07-23 = norte de UX;
 * NBACK_CHALLENGE_SPEC_v1 + decisiones #44 cerradas 2026-07-14 = parámetros ATP;
 * migración 197 = esquema):
 *  - Regla adaptativa de la REFERENCIA (spec nuevo, verbatim): cualquiera <75%
 *    → baja N; ambos ≥90% → sube N; si no → igual. (Supersede el 80/50 de
 *    Brain Workshop del spec viejo — el nuevo es el norte y sus pantallas de
 *    resultados marcan 75/90.)
 *  - Decisión #44-1: primera vez = tutorial N=1 forzado; después resume_mode
 *    ('last' default | 'best' | 'restart').
 *  - Decisión #44-2: timeout 3s por trial (base 1x; speed lo divide).
 *  - Letras: set fónico MX del spec nuevo (A O U F L M R S) — Enrique las
 *    graba; TTS es-MX como fallback mientras llegan (nback-audio.ts).
 *  - Round = 20 trials evaluables (+N de arranque). 12 rounds/día. Reto 20 días.
 */

export type NBackResumeMode = 'last' | 'best' | 'restart';

export const NBACK_CONFIG = {
  N_MIN: 1,
  N_START: 2,          // default nback_user_state.current_n (mig 197)
  TUTORIAL_N: 1,       // decisión #44-1: primera sesión SIEMPRE N=1
  SCOREABLE_TRIALS: 20, // trials evaluables → estímulos por round = 20 + N
  FORCED_MATCHES_PER_CHANNEL: 6,
  TRIAL_MS: 3000,      // decisión #44-2: 3s por trial a velocidad 1x
  STIMULUS_VISIBLE_MS: 500,
  ROUNDS_PER_DAY: 12,
  CHALLENGE_DAYS: 20,
  RAISE_THRESHOLD: 0.9,  // ambos canales ≥90% → N+1
  DROP_THRESHOLD: 0.75,  // cualquier canal <75% → N−1
  SPEEDS: [1, 1.5, 2] as const,
  POSITION_COUNT: 8,     // grid 3×3 sin el centro (crosshair)
  LETTERS: ['a', 'o', 'u', 'f', 'l', 'm', 'r', 's'] as const,
} as const;

export type NBackLetter = (typeof NBACK_CONFIG.LETTERS)[number];

/** Cómo se pronuncia cada letra para el fallback TTS es-MX. */
export const LETTER_SPOKEN: Record<NBackLetter, string> = {
  a: 'a', o: 'o', u: 'u', f: 'efe', l: 'ele', m: 'eme', r: 'erre', s: 'ese',
};

/** Celda 0..7 → [row, col] del grid 3×3 (centro [1,1] excluido = crosshair). */
export function cellToRowCol(cell: number): [number, number] {
  const grid = cell >= 4 ? cell + 1 : cell; // saltar el centro (índice 4)
  return [Math.floor(grid / 3), grid % 3];
}

export function stimuliCountFor(n: number): number {
  return NBACK_CONFIG.SCOREABLE_TRIALS + Math.max(0, n);
}

/** Duración de un trial según speed (3000ms a 1x; 2x = 1500ms). */
export function trialDurationMs(speed: number): number {
  const s = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.round(NBACK_CONFIG.TRIAL_MS / s);
}

export interface NBackRound {
  n: number;
  /** Celda 0..7 por trial. */
  positions: number[];
  /** Índice de letra 0..7 por trial. */
  letters: number[];
  /** true si el trial i es match del canal (i ≥ n y seq[i] === seq[i−n]). */
  visualMatches: boolean[];
  audioMatches: boolean[];
}

type Rng = () => number;

function randInt(rng: Rng, max: number): number {
  return Math.min(max - 1, Math.floor(rng() * max));
}

/** Elige k índices distintos del rango [from, to] (inclusive). */
function pickDistinct(rng: Rng, from: number, to: number, k: number): Set<number> {
  const pool: number[] = [];
  for (let i = from; i <= to; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, Math.max(0, Math.min(k, pool.length))));
}

function buildChannel(rng: Rng, count: number, n: number, symbols: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < count; i++) seq.push(randInt(rng, symbols));
  // Forzar ~6 matches (los aleatorios accidentales se aceptan — son lures
  // legítimos del juego y el scoring se calcula sobre la secuencia real).
  // ASCENDENTE obligatorio: escribir seq[j] fuera de orden puede romper un
  // match ya forzado en i cuando j === i−n; en orden ascendente cada write
  // solo lee índices menores ya finales y las cadenas i, i+n propagan bien.
  const targets = [...pickDistinct(rng, n, count - 1, NBACK_CONFIG.FORCED_MATCHES_PER_CHANNEL)]
    .sort((a, b) => a - b);
  for (const i of targets) seq[i] = seq[i - n];
  return seq;
}

function matchesOf(seq: number[], n: number): boolean[] {
  return seq.map((v, i) => i >= n && v === seq[i - n]);
}

/**
 * Genera un round: dos canales independientes con ≥6 matches forzados cada
 * uno. `rng` inyectable para tests deterministas.
 */
export function generateRound(n: number, rng: Rng = Math.random): NBackRound {
  const count = stimuliCountFor(n);
  const positions = buildChannel(rng, count, n, NBACK_CONFIG.POSITION_COUNT);
  const letters = buildChannel(rng, count, n, NBACK_CONFIG.LETTERS.length);
  return {
    n,
    positions,
    letters,
    visualMatches: matchesOf(positions, n),
    audioMatches: matchesOf(letters, n),
  };
}

export interface ChannelScore {
  total: number;   // matches reales del canal
  hits: number;    // presionó y había match
  misses: number;  // había match y no presionó
  falses: number;  // presionó sin match
  accuracy: number; // hits / (total + falses) — fórmula spec #6
}

/** Puntúa un canal a partir de matches reales y lo presionado por trial. */
export function scoreChannel(matches: boolean[], pressed: boolean[]): ChannelScore {
  let hits = 0, misses = 0, falses = 0, total = 0;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i]) {
      total++;
      if (pressed[i]) hits++;
      else misses++;
    } else if (pressed[i]) {
      falses++;
    }
  }
  const denom = total + falses;
  return { total, hits, misses, falses, accuracy: denom === 0 ? 1 : hits / denom };
}

export interface NBackRoundResult {
  accuracyVisual: number;
  accuracyAudio: number;
  promoted: boolean;
  demoted: boolean;
  nextN: number;
}

/**
 * Regla adaptativa de la referencia (75/90): cualquiera <75% baja (piso N_MIN),
 * ambos ≥90% sube (sin techo — Jaeggi llegó a N=8+), si no se mantiene.
 */
export function evaluateRound(accuracyVisual: number, accuracyAudio: number, n: number): NBackRoundResult {
  const v = Number.isFinite(accuracyVisual) ? accuracyVisual : 0;
  const a = Number.isFinite(accuracyAudio) ? accuracyAudio : 0;
  let nextN = n;
  let promoted = false;
  let demoted = false;
  if (v < NBACK_CONFIG.DROP_THRESHOLD || a < NBACK_CONFIG.DROP_THRESHOLD) {
    nextN = Math.max(NBACK_CONFIG.N_MIN, n - 1);
    demoted = nextN < n;
  } else if (v >= NBACK_CONFIG.RAISE_THRESHOLD && a >= NBACK_CONFIG.RAISE_THRESHOLD) {
    nextN = n + 1;
    promoted = true;
  }
  return { accuracyVisual: v, accuracyAudio: a, promoted, demoted, nextN };
}

/**
 * N de arranque de sesión (decisión #44-1): 0 sesiones históricas → tutorial
 * N=1 forzado; después según resume_mode del usuario.
 */
export function startingN(
  sessionsTotal: number,
  currentN: number,
  bestN: number,
  resumeMode: NBackResumeMode,
): number {
  if (sessionsTotal <= 0) return NBACK_CONFIG.TUTORIAL_N;
  if (resumeMode === 'restart') return NBACK_CONFIG.N_MIN;
  if (resumeMode === 'best') return Math.max(NBACK_CONFIG.N_MIN, bestN);
  return Math.max(NBACK_CONFIG.N_MIN, currentN);
}

/** Días entre dos fechas locales 'YYYY-MM-DD' (b − a), puro sin TZ del device. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Racha en días con ≥1 round: mismo día → igual; ayer → +1; hueco → reinicia
 * en 1. `lastSessionDate` null (primera vez) → 1.
 */
export function nextStreak(lastSessionDate: string | null, today: string, streakDays: number): number {
  if (!lastSessionDate) return 1;
  const gap = daysBetween(lastSessionDate, today);
  if (gap <= 0) return Math.max(1, streakDays);
  if (gap === 1) return streakDays + 1;
  return 1;
}

/** Badges de progreso por best N (decisión #44-5). */
export const NBACK_BADGES = [
  { minN: 1, emoji: '🌱', label: 'Novato' },
  { minN: 2, emoji: '🌿', label: 'Aprendiz' },
  { minN: 3, emoji: '🍀', label: 'Practicante' },
  { minN: 4, emoji: '🌳', label: 'Adepto' },
  { minN: 5, emoji: '🎋', label: 'Avanzado' },
  { minN: 6, emoji: '🌲', label: 'Maestro' },
  { minN: 7, emoji: '🌟', label: 'Élite' },
] as const;

export function badgeForBestN(bestN: number): (typeof NBACK_BADGES)[number] {
  let badge: (typeof NBACK_BADGES)[number] = NBACK_BADGES[0];
  for (const b of NBACK_BADGES) if (bestN >= b.minN) badge = b;
  return badge;
}

/** Día del reto (1..20) según días DISTINTOS con actividad; 0 si no arrancó. */
export function challengeDay(distinctActiveDays: number): number {
  return Math.max(0, Math.min(NBACK_CONFIG.CHALLENGE_DAYS, distinctActiveDays));
}
