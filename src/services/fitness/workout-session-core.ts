/**
 * Workout Session core (MB-3 Track D) — cálculo puro del resumen de sesión
 * y de PRs. Sin RN ni Supabase: testeable en Vitest node-only.
 */

export interface SessionSet {
  slug: string;
  nombre: string;
  setNumber: number;
  reps: number;               // isométricos: segundos de hold
  weightKg: number | null;
  esIsometrico: boolean;
  metodo: string;             // 'Estándar' | '3-5' | 'EMOM Auto' | 'Myo-reps'
  slot?: string;
  /** MB-3.6 Bloque 5: benchmarks de distancia (broad jump) — cm del intento. */
  distanceCm?: number | null;
}

export interface SessionSummary {
  exercisesCount: number;
  setsCount: number;
  volumeKg: number;
}

/** Epley 1RM (mismo criterio que log-exercise / exercise-service). */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Resumen de la sesión: ejercicios únicos, sets válidos y volumen (kg × reps). */
export function computeSessionSummary(sets: SessionSet[]): SessionSummary {
  const validos = sets.filter((s) => s.reps > 0);
  const slugs = new Set(validos.map((s) => s.slug));
  const volumeKg = validos.reduce((sum, s) => {
    if (s.esIsometrico || s.weightKg == null || s.weightKg <= 0) return sum;
    return sum + s.weightKg * s.reps;
  }, 0);
  return {
    exercisesCount: slugs.size,
    setsCount: validos.length,
    volumeKg: Math.round(volumeKg * 10) / 10,
  };
}

export interface PRUpdate {
  slug: string;
  nombre: string;
  weightKg: number;
  reps: number;
  new1RM: number;
  prev1RM: number | null;
  /** % de mejora vs el PR previo (null si es el primer PR). */
  mejoraPct: number | null;
  /** Brinco >15% ⇒ celebración (doctrina carrot). */
  celebrar: boolean;
}

export const CELEBRACION_MEJORA_PCT = 15;

/**
 * Detecta PRs de la sesión: mejor 1RM estimado por ejercicio vs el PR previo.
 * Los isométricos y sets sin peso no compiten por 1RM.
 */
export function computePRUpdates(
  sets: SessionSet[],
  prev1RMBySlug: Record<string, number>,
): PRUpdate[] {
  const bestBySlug = new Map<string, { set: SessionSet; rm: number }>();
  for (const s of sets) {
    if (s.esIsometrico || s.weightKg == null || s.weightKg <= 0 || s.reps <= 0) continue;
    const rm = epley1RM(s.weightKg, s.reps);
    const prev = bestBySlug.get(s.slug);
    if (!prev || rm > prev.rm) bestBySlug.set(s.slug, { set: s, rm });
  }
  const out: PRUpdate[] = [];
  for (const [slug, { set: s, rm }] of bestBySlug) {
    const prev = prev1RMBySlug[slug] ?? null;
    if (prev != null && rm <= prev) continue;
    const mejoraPct = prev != null && prev > 0 ? ((rm - prev) / prev) * 100 : null;
    out.push({
      slug,
      nombre: s.nombre,
      weightKg: s.weightKg!,
      reps: s.reps,
      new1RM: Math.round(rm * 10) / 10,
      prev1RM: prev,
      mejoraPct,
      celebrar: mejoraPct != null && mejoraPct > CELEBRACION_MEJORA_PCT,
    });
  }
  return out.sort((a, b) => (b.mejoraPct ?? 0) - (a.mejoraPct ?? 0));
}
