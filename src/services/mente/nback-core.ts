/**
 * nback-core — motor PURO del N-Back Challenge (Mente V1.5, spec Cowork
 * NBACK_CHALLENGE_SPEC_v1_2026-07-11). Sin react-native/supabase → vitest.
 *
 * Dual N-Back (Jaeggi 2008): 2 canales simultáneos (casilla en grilla 3×3 +
 * letra hablada); el user marca match por canal contra N pasos atrás.
 * Progresión regla Brain Workshop (gold standard): ≥80% ambos canales sube,
 * <50% en cualquiera baja, intermedio mantiene.
 *
 * ⚠️ DEFAULTS SANCIONADOS (megabuzón 2da pasada C.1 — Enrique/Cowork validan):
 *   1. N mínimo = 2 (estándar Brain Workshop; no baja de ahí)
 *   2. Timeout de respuesta = 3 segundos por estímulo
 *   3. Auriculares: SÍ requeridos (copy obligatorio pre-sesión)
 *   4. Modo daltónico: SÍ (formas alternativas además del color)
 *   5. Free tier: N ilimitado (sin gate por tier)
 * Si Enrique cambia alguna respuesta, este bloque es la única fuente a tocar.
 */

// ── Configuración (decisiones 1-5) ───────────────────────────────────────────

export const NBACK_CONFIG = {
  /** Decisión 1: piso de N — la demotion nunca baja de aquí. */
  N_MIN: 2,
  /** N inicial para users nuevos (= N_MIN, estándar Brain Workshop). */
  N_START: 2,
  /** Decisión 2: ventana de respuesta por estímulo (ms). */
  RESPONSE_TIMEOUT_MS: 3000,
  /** Decisión 3: la UI exige copy "usa auriculares" antes de la sesión. */
  HEADPHONES_REQUIRED: true,
  /** Decisión 4: la UI ofrece formas por casilla además del color. */
  COLORBLIND_MODE_AVAILABLE: true,
  /** Decisión 5: null = sin techo de N para free tier (ilimitado). */
  FREE_TIER_N_MAX: null as number | null,
  /** Umbral de promoción (accuracy en AMBOS canales). */
  PROMOTE_THRESHOLD: 0.8,
  /** Umbral de demotion (accuracy en CUALQUIER canal por debajo). */
  DEMOTE_THRESHOLD: 0.5,
  /** Matches objetivo por canal por bloque (Brain Workshop usa 6). */
  TARGET_MATCHES_PER_CHANNEL: 6,
} as const;

/** Letras habladas del canal auditivo (set estándar Brain Workshop). */
export const NBACK_LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'] as const;

/** Lado de la grilla visual (3×3). Celdas 0-indexadas [fila, columna]. */
export const NBACK_GRID_SIZE = 3;

/** Estímulos por bloque para un N dado (estándar: 20 + N → ~2 min). */
export function stimuliCountFor(n: number): number {
  return 20 + Math.max(1, Math.floor(n));
}

// ── Evaluación de bloque (regla Brain Workshop) ──────────────────────────────

export interface NBackBlock {
  nLevel: number;
  stimuliCount: number;
  /** Matches que HABÍA en la secuencia, por canal. */
  visualMatchesTotal: number;
  audioMatchesTotal: number;
  /** Matches que el user acertó (presionó cuando había). */
  visualHits: number;
  audioHits: number;
  /** Presiones cuando NO había match. */
  visualFalsePositives: number;
  audioFalsePositives: number;
}

export interface NBackResult {
  /** hit / (hit + miss + false) por canal — misses = total − hits. */
  accuracyVisual: number;
  accuracyAudio: number;
  promoted: boolean;
  demoted: boolean;
  nextN: number;
  visualMisses: number;
  audioMisses: number;
}

/**
 * Accuracy de un canal: hits / (hits + misses + falsePositives).
 * Como hits + misses = matchesTotal → hits / (matchesTotal + falsePositives).
 * Sin matches y sin falsos → 1 (no había nada que fallar).
 */
export function channelAccuracy(matchesTotal: number, hits: number, falsePositives: number): number {
  const clampedHits = Math.min(Math.max(0, hits), Math.max(0, matchesTotal));
  const denom = Math.max(0, matchesTotal) + Math.max(0, falsePositives);
  if (denom === 0) return 1;
  return clampedHits / denom;
}

/** Evalúa un bloque terminado: accuracies + promoción/demotion + siguiente N. */
export function evaluateBlock(block: NBackBlock): NBackResult {
  const accuracyVisual = channelAccuracy(block.visualMatchesTotal, block.visualHits, block.visualFalsePositives);
  const accuracyAudio = channelAccuracy(block.audioMatchesTotal, block.audioHits, block.audioFalsePositives);

  const promoted = accuracyVisual >= NBACK_CONFIG.PROMOTE_THRESHOLD
    && accuracyAudio >= NBACK_CONFIG.PROMOTE_THRESHOLD;
  const demoted = !promoted
    && (accuracyVisual < NBACK_CONFIG.DEMOTE_THRESHOLD || accuracyAudio < NBACK_CONFIG.DEMOTE_THRESHOLD);

  const nextN = promoted
    ? block.nLevel + 1
    : demoted
      ? Math.max(NBACK_CONFIG.N_MIN, block.nLevel - 1)
      : block.nLevel;

  return {
    accuracyVisual,
    accuracyAudio,
    promoted,
    demoted,
    nextN,
    visualMisses: Math.max(0, block.visualMatchesTotal - Math.min(block.visualHits, block.visualMatchesTotal)),
    audioMisses: Math.max(0, block.audioMatchesTotal - Math.min(block.audioHits, block.audioMatchesTotal)),
  };
}

// ── Generación de estímulos ──────────────────────────────────────────────────

export type GridCell = [number, number];

export interface StimuliSequence {
  /** Casilla iluminada por estímulo, 0-indexada [fila, columna] en 3×3. */
  visual: GridCell[];
  /** Letra hablada por estímulo (de NBACK_LETTERS). */
  audio: string[];
  /** Índices (0-based) donde HAY match visual contra i−N. */
  matchesVisual: number[];
  /** Índices (0-based) donde HAY match auditivo contra i−N. */
  matchesAudio: number[];
}

/** rng inyectable → tests deterministas (regla del repo: nada de crypto). */
export type Rng = () => number;

function randInt(rng: Rng, maxExclusive: number): number {
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

/** Elige `k` índices distintos del rango [from, to) — orden ascendente. */
function pickDistinctIndices(rng: Rng, from: number, to: number, k: number): number[] {
  const pool: number[] = [];
  for (let i = from; i < to; i++) pool.push(i);
  // Fisher-Yates parcial
  for (let i = 0; i < Math.min(k, pool.length); i++) {
    const j = i + randInt(rng, pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(k, pool.length)).sort((a, b) => a - b);
}

function cellIndex(cell: GridCell): number {
  return cell[0] * NBACK_GRID_SIZE + cell[1];
}

function cellFromIndex(idx: number): GridCell {
  return [Math.floor(idx / NBACK_GRID_SIZE), idx % NBACK_GRID_SIZE];
}

/**
 * Genera la secuencia de un bloque: exactamente `targetMatches` matches por
 * canal en posiciones aleatorias elegibles (i ≥ n), y CERO matches accidentales
 * (los no-match se re-rollean para no coincidir con i−N → el conteo de matches
 * que la UI debe capturar es exacto, sin ambigüedad al puntuar).
 */
export function generateStimuli(
  n: number,
  count: number,
  opts?: { targetMatchesPerChannel?: number; rng?: Rng },
): StimuliSequence {
  const rng = opts?.rng ?? Math.random;
  const eligible = Math.max(0, count - n);
  const target = Math.min(
    opts?.targetMatchesPerChannel ?? NBACK_CONFIG.TARGET_MATCHES_PER_CHANNEL,
    eligible,
  );

  const matchesVisual = pickDistinctIndices(rng, n, count, target);
  const matchesAudio = pickDistinctIndices(rng, n, count, target);
  const visualMatchSet = new Set(matchesVisual);
  const audioMatchSet = new Set(matchesAudio);

  const totalCells = NBACK_GRID_SIZE * NBACK_GRID_SIZE;
  const visual: GridCell[] = [];
  const audio: string[] = [];

  for (let i = 0; i < count; i++) {
    if (i < n) {
      visual.push(cellFromIndex(randInt(rng, totalCells)));
      audio.push(NBACK_LETTERS[randInt(rng, NBACK_LETTERS.length)]);
      continue;
    }
    // Canal visual
    if (visualMatchSet.has(i)) {
      visual.push([...visual[i - n]] as GridCell);
    } else {
      const avoid = cellIndex(visual[i - n]);
      let idx = randInt(rng, totalCells - 1);
      if (idx >= avoid) idx += 1; // salta la celda que crearía match accidental
      visual.push(cellFromIndex(idx));
    }
    // Canal auditivo
    if (audioMatchSet.has(i)) {
      audio.push(audio[i - n]);
    } else {
      const avoid = NBACK_LETTERS.indexOf(audio[i - n] as typeof NBACK_LETTERS[number]);
      let idx = randInt(rng, NBACK_LETTERS.length - 1);
      if (idx >= avoid) idx += 1;
      audio.push(NBACK_LETTERS[idx]);
    }
  }

  return { visual, audio, matchesVisual, matchesAudio };
}

// ── Racha (streak) ───────────────────────────────────────────────────────────

/**
 * Nueva racha tras completar una sesión hoy. Fechas como 'YYYY-MM-DD' locales
 * (getLocalToday). Mismo día → sin cambio; ayer → +1; otro/null → reinicia en 1.
 */
export function nextStreak(
  lastSessionDate: string | null,
  today: string,
  currentStreak: number,
): number {
  if (!lastSessionDate) return 1;
  if (lastSessionDate === today) return Math.max(1, currentStreak);
  const last = new Date(`${lastSessionDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);
  return diffDays === 1 ? Math.max(1, currentStreak) + 1 : 1;
}
