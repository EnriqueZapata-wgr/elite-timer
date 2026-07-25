/**
 * Puente Fitness → Edad ATP (MB-3 Track C) — núcleo PURO.
 *
 * ADITIVO al motor congelado (edad-atp/*, validado por Mariana): NO recalcula
 * nada del motor. Hace dos cosas:
 *
 * 1. TIER A (primarias, norma clínica): traduce sets de la sesión de fuerza a
 *    entradas de `edad_atp_functional_tests` con la MISMA test_key que ya lee
 *    el motor (loadAllParamValues → resolveParamValues → motor v2). El log ES
 *    el test: verdad medida, peso sólido.
 *      · push-up (slug estricto 'push-up') → test_key 'pushups' (reps máx).
 *        ⚠️ El umbral 40 (Yang/JAMA 2019) se derivó SOLO en hombres. Sin banda
 *        femenina propia NO se alimenta la primaria en mujeres (mejor omitir
 *        que mentir) — ver PUSHUPS_NORMA_FEMENINA_DISPONIBLE.
 *      · hand-plank (plancha estándar) → test_key 'plank' (segundos, unisex).
 *    Las variantes taggeadas Tier A (incline/decline/diamond, side plank)
 *    NO alimentan la norma — la norma clínica es del movimiento estándar.
 *
 * 2. TIER B (secundarias, heurística Attia/Galpin): capa de PROYECCIÓN con
 *    nudge MÍNIMO acotado. Relativo SIEMPRE (×peso corporal / reps máximas),
 *    nunca kg absolutos. Cap duro: ninguna secundaria (ni todas juntas)
 *    puede dominar a una primaria — ver test que lo verifica contra el motor.
 *
 * Bandas Tier B ancladas a R and D/RESEARCH_BENCHMARKS_EDAD_BIOLOGICA.md
 * (heurísticas de experto, etiquetadas honestamente como no-clínicas).
 */
import type { MatrixExercise } from '@/src/constants/exercise-matrix';

// ── Flags de rigor ──

/**
 * false hasta que exista banda femenina PROPIA para push-ups (el 40 de Yang
 * 2019 es de hombres; no se extrapola con descuento — doctrina Mariana).
 */
export const PUSHUPS_NORMA_FEMENINA_DISPONIBLE = false;

// ── Tier A ──

export type Sexo = 'male' | 'female';

export interface SessionSetLike {
  slug: string;
  /** Reps del set; para isométricos son SEGUNDOS de hold. */
  reps: number;
  weightKg: number | null;
  /** MB-3.6 Bloque 5: distancia en cm (benchmarks de distancia — broad jump). */
  distanceCm?: number | null;
}

export interface FunctionalEntry {
  test_key: string;
  value_primary: number;
}

export interface TierAResult {
  entries: FunctionalEntry[];
  /** Etiquetas humanas de lo que alimentó el score (para el cierre de sesión). */
  alimentado: string[];
  avisos: string[];
}

/** Slugs estrictos cuyo log alimenta la norma clínica (movimiento estándar). */
const TIER_A_FEED: Record<string, { testKey: 'pushups' | 'plank'; label: string; esSegundos: boolean; soloConNorma?: 'pushups' }> = {
  'push-up': { testKey: 'pushups', label: 'Push-ups máx', esSegundos: false, soloConNorma: 'pushups' },
  'hand-plank': { testKey: 'plank', label: 'Plancha (s)', esSegundos: true },
};

/**
 * Traduce los sets de una sesión a entradas Tier A para
 * edad_atp_functional_tests. Toma el MEJOR set por benchmark (reps máximas /
 * hold más largo) y solo sets SIN lastre (la norma es a peso corporal).
 */
export function tierAFunctionalEntries(sets: SessionSetLike[], sexo: Sexo): TierAResult {
  const entries: FunctionalEntry[] = [];
  const alimentado: string[] = [];
  const avisos: string[] = [];
  for (const [slug, spec] of Object.entries(TIER_A_FEED)) {
    const propios = sets.filter((s) => s.slug === slug && (s.weightKg == null || s.weightKg === 0) && s.reps > 0);
    if (propios.length === 0) continue;
    if (spec.soloConNorma === 'pushups' && sexo === 'female' && !PUSHUPS_NORMA_FEMENINA_DISPONIBLE) {
      avisos.push(
        'Push-ups: la norma clínica disponible se derivó en hombres. No aplicamos ese umbral a tu score — mejor omitir que mentir.',
      );
      continue;
    }
    const mejor = Math.max(...propios.map((s) => s.reps));
    entries.push({ test_key: spec.testKey, value_primary: mejor });
    alimentado.push(`${spec.label}: ${mejor}`);
  }
  return { entries, alimentado, avisos };
}

// ── Tier B (proyección con nudge acotado) ──

/**
 * Cap por benchmark y total (años de proyección). El cap total (1.2) queda
 * MUY por debajo de lo que mueve una primaria entre bandas (verificado en
 * test contra computeAreaFitness) — ninguna secundaria domina a una primaria.
 */
export const NUDGE_MAX_POR_BENCHMARK = 0.4;
export const NUDGE_CAP_TOTAL = 1.2;

export type TierBKey =
  | 'deadlift_xbw' | 'pullups_max' | 'pullups_lastrado' | 'farmer_carry' | 'wall_sit'
  | 'dead_hang' | 'broad_jump';

interface TierBSpec {
  key: TierBKey;
  label: string;
  /** Fuente de la banda (etiquetado honesto: heurística, no clínica). */
  fuente: string;
  /** Progreso 0-1 hacia el target de experto (SIEMPRE relativo). */
  progreso: (
    mejor: { reps: number; weightKg: number | null; distanceCm?: number | null },
    bodyweightKg: number,
    sexo: Sexo,
    estaturaCm: number | null,
  ) => number | null;
}

/** Epley (mismo criterio que el resto del pilar). */
function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

const TIER_B_SPECS: Record<string, TierBSpec> = {
  // Deadlift relativo: target 2.0×BW (H) / 1.5×BW (M) — Attia + estándares de fuerza.
  'barbell-deadlift': {
    key: 'deadlift_xbw', label: 'Peso muerto ×BW', fuente: 'Attia (heurística)',
    progreso: (m, bw, sexo) => {
      if (!m.weightKg || bw <= 0) return null;
      const target = sexo === 'male' ? 2.0 : 1.5;
      return Math.min(1, e1rm(m.weightKg, m.reps) / bw / target);
    },
  },
  // Pull-ups / chin-ups: reps máximas (target práctico 10 H / 5 M).
  'pull-ups': {
    key: 'pullups_max', label: 'Pull-ups máx', fuente: 'Estándares prácticos',
    progreso: (m, _bw, sexo) => (m.reps > 0 ? Math.min(1, m.reps / (sexo === 'male' ? 10 : 5)) : null),
  },
  'chin-ups': {
    key: 'pullups_max', label: 'Chin-ups máx', fuente: 'Estándares prácticos',
    progreso: (m, _bw, sexo) => (m.reps > 0 ? Math.min(1, m.reps / (sexo === 'male' ? 10 : 5)) : null),
  },
  // Pull-up lastrado: carga extra relativa (target 0.5×BW en el lastre).
  'pull-ups-lastre': {
    key: 'pullups_lastrado', label: 'Pull-up lastrado ×BW', fuente: 'Estándares prácticos',
    progreso: (m, bw) => {
      if (!m.weightKg || bw <= 0 || m.reps <= 0) return null;
      return Math.min(1, m.weightKg / bw / 0.5);
    },
  },
  // Farmer carry: peso total ≈ BW (½ BW por mano) — Attia "bueno".
  'kettlebell-farmers-carry': {
    key: 'farmer_carry', label: 'Farmer carry ×BW', fuente: 'Attia (heurística)',
    progreso: (m, bw) => {
      if (!m.weightKg || bw <= 0) return null;
      return Math.min(1, m.weightKg / bw);
    },
  },
  // Wall sit: hold hacia 120 s — Attia ~2 min. (Isométrico: reps = segundos.)
  'wall-sit': {
    key: 'wall_sit', label: 'Wall sit (s)', fuente: 'Attia (heurística)',
    progreso: (m) => (m.reps > 0 ? Math.min(1, m.reps / 120) : null),
  },
  // Dead hang: hold hacia 120 s (H) / 90 s (M) — Attia. (Isométrico: reps = segundos.)
  'dead-hang': {
    key: 'dead_hang', label: 'Dead hang (s)', fuente: 'Attia (heurística)',
    progreso: (m, _bw, sexo) => (m.reps > 0 ? Math.min(1, m.reps / (sexo === 'male' ? 120 : 90)) : null),
  },
  // Broad jump (MB-3.6 Bloque 5 — ACTIVADO): el benchmark es DISTANCIA
  // relativa a tu ESTATURA (target ≈ 1× estatura, Estándares prácticos). El
  // runner ya captura cm para este ejercicio; sin estatura declarada o sin
  // distancia capturada, se omite (relativo o nada — mejor omitir que mentir).
  'broad-jump': {
    key: 'broad_jump', label: 'Broad jump ×estatura', fuente: 'Estándares prácticos',
    progreso: (m, _bw, _sexo, estaturaCm) => {
      if (!m.distanceCm || m.distanceCm <= 0 || !estaturaCm || estaturaCm <= 0) return null;
      return Math.min(1, m.distanceCm / estaturaCm);
    },
  },
};

export interface TierBProjection {
  /** Años de proyección (≤ 0 = "en camino a bajar"). Acotado por NUDGE_CAP_TOTAL. */
  years: number;
  detalle: { key: TierBKey; label: string; progreso: number; years: number; fuente: string }[];
  /** Copy honesto para UI ("vas en camino… confírmalo con tu benchmark"). */
  texto: string | null;
}

/**
 * Proyección Tier B desde los mejores sets por slug. `bodyweightKg` es
 * obligatorio para los relativos ×BW y `estaturaCm` para los de distancia
 * (sin ellos, esos benchmarks se omiten — relativo o nada, nunca absolutos).
 */
export function computeTierBProjection(
  sets: SessionSetLike[],
  bodyweightKg: number | null,
  sexo: Sexo,
  estaturaCm: number | null = null,
): TierBProjection {
  const bw = bodyweightKg ?? 0;
  const porKey = new Map<TierBKey, { label: string; progreso: number; fuente: string }>();
  for (const [slug, spec] of Object.entries(TIER_B_SPECS)) {
    const propios = sets.filter((s) => s.slug === slug);
    if (propios.length === 0) continue;
    let mejorProgreso: number | null = null;
    for (const s of propios) {
      const p = spec.progreso({ reps: s.reps, weightKg: s.weightKg, distanceCm: s.distanceCm }, bw, sexo, estaturaCm);
      if (p != null && (mejorProgreso == null || p > mejorProgreso)) mejorProgreso = p;
    }
    if (mejorProgreso == null) continue;
    const prev = porKey.get(spec.key);
    if (!prev || mejorProgreso > prev.progreso) {
      porKey.set(spec.key, { label: spec.label, progreso: mejorProgreso, fuente: spec.fuente });
    }
  }

  const detalle = [...porKey.entries()].map(([key, v]) => ({
    key,
    label: v.label,
    progreso: v.progreso,
    years: -(v.progreso * NUDGE_MAX_POR_BENCHMARK),
    fuente: v.fuente,
  }));
  const suma = detalle.reduce((s, d) => s + d.years, 0);
  const years = Math.max(suma, -NUDGE_CAP_TOTAL);
  const texto = detalle.length > 0
    ? `Vas en camino a bajar ~${Math.abs(years).toFixed(1)} años (referencia de experto). Confírmalo con tu benchmark medido.`
    : null;
  return { years, detalle, texto };
}

/** ¿Este slug es un benchmark de DISTANCIA? (el runner captura cm, no reps). */
export function esBenchmarkDistancia(slug: string): boolean {
  return slug === 'broad-jump';
}

// ── Helpers para UI (badge de benchmark en biblioteca/detalle) ──

/** ¿Este ejercicio de la matriz alimenta la Edad ATP y cómo? */
export function benchmarkInfo(ex: Pick<MatrixExercise, 'slug' | 'benchmark'>): {
  tier: 'A' | 'B' | null;
  alimentaDirecto: boolean; // Tier A estricto (el log ES el test)
} {
  return {
    tier: ex.benchmark.tier,
    alimentaDirecto: ex.benchmark.tier === 'A' && ex.slug in TIER_A_FEED,
  };
}
