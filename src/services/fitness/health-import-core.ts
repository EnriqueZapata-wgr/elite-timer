/**
 * Health Import core (MB-3.6 Bloque 3.2) — núcleo PURO del import de
 * entrenamientos desde Health Connect (Android) / HealthKit (iOS).
 *
 * Una integración, todas las fuentes: Strava, Garmin, Samsung Health y Google
 * Fit escriben en la plataforma de salud del sistema; nosotros solo LEEMOS
 * entrenamientos (tipo, duración, distancia, calorías, FC media) — nada más
 * (minimización de datos).
 *
 * ⚠️ DEDUPE (footgun crítico del brief): un entrenamiento importado NO debe
 * duplicar uno registrado a mano ni re-importarse. Doble candado:
 *   1. external_id (uuid del proveedor) — único por usuario en DB (mig 225).
 *   2. Heurística (fecha + disciplina + duración aproximada) contra TODO lo
 *      existente del día, incluidas sesiones manuales sin external_id.
 * Puro: cero RN/Supabase — testeable en Vitest node-only.
 */
import type { CardioDiscipline } from '@/src/services/fitness-service';

/** Valores de `source` que el import puede mandar — el contrato contra el
 * CHECK de cardio_sessions vive en health-import-source-contract.test.ts. */
export const HEALTH_SOURCES = ['health_connect', 'healthkit'] as const;
export type HealthSource = (typeof HEALTH_SOURCES)[number];

/** Entrenamiento normalizado desde la plataforma de salud. */
export interface NormalizedWorkout {
  /** uuid/recordId del proveedor — candado #1 del dedupe. */
  externalId: string;
  discipline: CardioDiscipline;
  /** Fecha LOCAL (YYYY-MM-DD) del inicio del entrenamiento. */
  dateLocal: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  calories: number | null;
  source: HealthSource;
}

/** Sesión existente mínima para dedupear (shape de cardio_sessions). */
export interface ExistingSessionLike {
  date: string;
  discipline: string;
  duration_seconds: number | null;
  external_id?: string | null;
}

// ── Mapeo de tipos de actividad → disciplina ATP ──

/** Health Connect ExerciseType (int) → disciplina. Lo no mapeado = 'other'. */
const HEALTH_CONNECT_TYPES: Record<number, CardioDiscipline> = {
  8: 'cycling',   // BIKING
  9: 'cycling',   // BIKING_STATIONARY
  53: 'rowing',   // ROWING
  54: 'rowing',   // ROWING_MACHINE
  56: 'running',  // RUNNING
  57: 'running',  // RUNNING_TREADMILL
  73: 'swimming', // SWIMMING_OPEN_WATER
  74: 'swimming', // SWIMMING_POOL
};

/** HealthKit HKWorkoutActivityType (int) → disciplina. Lo no mapeado = 'other'. */
const HEALTHKIT_TYPES: Record<number, CardioDiscipline> = {
  13: 'cycling',
  35: 'rowing',
  37: 'running',
  46: 'swimming',
};

export function disciplineFromHealthConnect(exerciseType: number): CardioDiscipline {
  return HEALTH_CONNECT_TYPES[exerciseType] ?? 'other';
}

export function disciplineFromHealthKit(activityType: number): CardioDiscipline {
  return HEALTHKIT_TYPES[activityType] ?? 'other';
}

// ── Dedupe ──

/** Tolerancia de duración para considerar "el mismo entrenamiento": ±10% o ±90 s (lo mayor). */
export function duracionesAproximadas(a: number, b: number): boolean {
  const tolerancia = Math.max(90, Math.max(a, b) * 0.1);
  return Math.abs(a - b) <= tolerancia;
}

export interface DedupeResult {
  nuevos: NormalizedWorkout[];
  duplicados: NormalizedWorkout[];
}

/**
 * Separa candidatos en nuevos vs duplicados contra lo ya persistido.
 * Duplicado si: (a) mismo external_id, o (b) mismo día + misma disciplina +
 * duración aproximada (cubre el manual↔importado en ambas direcciones).
 * También dedupea DENTRO del lote (dos fuentes reportando el mismo workout).
 */
export function dedupeWorkouts(
  candidatos: NormalizedWorkout[],
  existentes: ExistingSessionLike[],
): DedupeResult {
  const idsExistentes = new Set(
    existentes.map((e) => e.external_id).filter((x): x is string => !!x),
  );
  const nuevos: NormalizedWorkout[] = [];
  const duplicados: NormalizedWorkout[] = [];

  const esDuplicadoDe = (w: NormalizedWorkout, e: ExistingSessionLike): boolean =>
    e.date === w.dateLocal &&
    e.discipline === w.discipline &&
    e.duration_seconds != null &&
    duracionesAproximadas(e.duration_seconds, w.durationSeconds);

  for (const w of candidatos) {
    if (idsExistentes.has(w.externalId)) { duplicados.push(w); continue; }
    if (existentes.some((e) => esDuplicadoDe(w, e))) { duplicados.push(w); continue; }
    // Dedupe intra-lote: contra los ya aceptados de esta pasada.
    if (nuevos.some((n) =>
      n.externalId === w.externalId ||
      (n.dateLocal === w.dateLocal && n.discipline === w.discipline && duracionesAproximadas(n.durationSeconds, w.durationSeconds)),
    )) { duplicados.push(w); continue; }
    nuevos.push(w);
  }
  return { nuevos, duplicados };
}

/**
 * ⚡ ECONOMÍA (brief 3.2): los importados otorgan como el manual pero SOLO por
 * el día de hoy (cero retroactividad) y bajo el mismo cap idempotente booleano
 * (awardBooleanElectron 'cardio' = 1/día, server-side). Esta función solo dice
 * SI corresponde intentar el award.
 */
export function importOtorgaElectron(nuevos: NormalizedWorkout[], hoyLocal: string): boolean {
  return nuevos.some((w) => w.dateLocal === hoyLocal && w.durationSeconds > 0);
}
