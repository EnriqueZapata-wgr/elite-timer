/**
 * Fitness Service — Queries del fitness hub:
 *   - Benchmarks de fuerza con sus variantes y PR actual
 *   - Sesiones de cardio (running/cycling/swimming/rowing)
 *   - PRs de cardio
 *   - Evaluaciones de movilidad
 */
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/services/routine-service';

// === BENCHMARKS DE FUERZA ===

export interface BenchmarkExercise {
  id: string;
  name: string;
  name_es: string;
  description: string;
  muscle_groups: string[] | null;
  difficulty: string | null;
  variants: { id: string; name: string; name_es: string }[];
  currentPR: number | null;        // mejor peso registrado (kg)
  estimated1RM: number | null;     // 1RM estimado
}

/** Obtiene los benchmarks (is_benchmark=true) con sus variantes y PR actual del usuario. */
export async function getBenchmarksWithVariants(): Promise<BenchmarkExercise[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1) Benchmarks
    const { data: benchmarks, error: bErr } = await supabase
      .from('exercises')
      .select('id, name, name_es, description, muscle_groups, difficulty')
      .eq('is_benchmark', true)
      .order('name');

    if (bErr || !benchmarks) return [];

    const benchmarkIds = benchmarks.map(b => b.id);

    // 2) Variantes (todas de una vez)
    const { data: variants } = await supabase
      .from('exercises')
      .select('id, name, name_es, parent_exercise_id')
      .in('parent_exercise_id', benchmarkIds);

    // 3) PRs del usuario para los benchmarks
    let prsByExercise = new Map<string, { weight_kg: number; estimated_1rm: number }>();
    if (user) {
      const { data: prs } = await supabase
        .from('personal_records')
        .select('exercise_id, weight_kg, estimated_1rm')
        .eq('user_id', user.id)
        .in('exercise_id', benchmarkIds);

      if (prs) {
        for (const pr of prs as any[]) {
          const existing = prsByExercise.get(pr.exercise_id);
          if (!existing || pr.weight_kg > existing.weight_kg) {
            prsByExercise.set(pr.exercise_id, {
              weight_kg: pr.weight_kg,
              estimated_1rm: pr.estimated_1rm,
            });
          }
        }
      }
    }

    // 4) Ensamblar
    return benchmarks.map((b: any) => {
      const exerciseVariants = (variants ?? [])
        .filter((v: any) => v.parent_exercise_id === b.id)
        .map((v: any) => ({ id: v.id, name: v.name, name_es: v.name_es ?? v.name }));

      const pr = prsByExercise.get(b.id);

      return {
        id: b.id,
        name: b.name,
        name_es: b.name_es ?? b.name,
        description: b.description ?? '',
        muscle_groups: b.muscle_groups,
        difficulty: b.difficulty,
        variants: exerciseVariants,
        currentPR: pr?.weight_kg ?? null,
        estimated1RM: pr?.estimated_1rm ?? null,
      };
    });
  } catch (err) {
    if (__DEV__) console.error('getBenchmarksWithVariants:', err);
    return [];
  }
}

// === CARDIO ===

export type CardioDiscipline = 'running' | 'cycling' | 'swimming' | 'rowing' | 'other';

export interface CardioSession {
  id: string;
  user_id: string;
  date: string;
  discipline: CardioDiscipline;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_heart_rate: number | null;
  avg_pace_seconds_per_km: number | null;
  perceived_effort: number | null;
  notes: string | null;
  source: string | null;
}

export interface CardioRecord {
  id: string;
  discipline: string;
  distance_label: string;
  best_time_seconds: number;
  achieved_at: string;
}

export interface LogCardioInput {
  discipline: CardioDiscipline;
  duration_seconds: number;
  distance_meters: number;
  avg_heart_rate?: number | null;
  perceived_effort?: number | null;
  notes?: string | null;
}

export interface CardioSaveResult {
  session: CardioSession;
  newPRs: { distance_label: string; time_seconds: number }[];
}

/** Distancias estándar por disciplina (en km), con tolerancia para detectar PRs. */
const STANDARD_DISTANCES: Record<CardioDiscipline, { km: number; label: string; toleranceKm: number }[]> = {
  running: [
    { km: 1, label: '1K', toleranceKm: 0.05 },
    { km: 5, label: '5K', toleranceKm: 0.2 },
    { km: 10, label: '10K', toleranceKm: 0.3 },
    { km: 21.1, label: '21K', toleranceKm: 0.5 },
    { km: 42.2, label: '42K', toleranceKm: 0.5 },
  ],
  cycling: [
    { km: 20, label: '20K', toleranceKm: 1 },
    { km: 40, label: '40K', toleranceKm: 1.5 },
    { km: 90, label: '90K', toleranceKm: 2 },
    { km: 180, label: '180K', toleranceKm: 3 },
  ],
  swimming: [
    { km: 0.1, label: '100m', toleranceKm: 0.01 },
    { km: 0.4, label: '400m', toleranceKm: 0.02 },
    { km: 1.5, label: '1500m', toleranceKm: 0.05 },
  ],
  rowing: [
    { km: 0.5, label: '500m', toleranceKm: 0.02 },
    { km: 1, label: '1K', toleranceKm: 0.05 },
    { km: 2, label: '2K', toleranceKm: 0.1 },
    { km: 5, label: '5K', toleranceKm: 0.2 },
  ],
  other: [],
};

/** Registra una sesion de cardio y verifica si rompe algun PR estandar. */
export async function logCardioSession(input: LogCardioInput): Promise<CardioSaveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const paceSecondsPerKm = input.distance_meters > 0
    ? Math.round(input.duration_seconds / (input.distance_meters / 1000))
    : null;

  const row = {
    id: generateUUID(),
    user_id: user.id,
    date: new Date().toISOString().split('T')[0],
    discipline: input.discipline,
    duration_seconds: input.duration_seconds,
    distance_meters: input.distance_meters,
    avg_pace_seconds_per_km: paceSecondsPerKm,
    avg_heart_rate: input.avg_heart_rate ?? null,
    perceived_effort: input.perceived_effort ?? null,
    notes: input.notes ?? null,
    source: 'manual',
  };

  const { data, error } = await supabase
    .from('cardio_sessions')
    .insert(row)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Error al guardar sesion');

  const session = data as CardioSession;
  const newPRs = await checkCardioRecords(session);

  return { session, newPRs };
}

/** Verifica si la sesion rompe algun PR de distancia estandar. */
async function checkCardioRecords(session: CardioSession): Promise<{ distance_label: string; time_seconds: number }[]> {
  if (!session.distance_meters || !session.duration_seconds) return [];

  const distances = STANDARD_DISTANCES[session.discipline as CardioDiscipline] ?? [];
  const distanceKm = session.distance_meters / 1000;
  const newPRs: { distance_label: string; time_seconds: number }[] = [];

  for (const std of distances) {
    if (Math.abs(distanceKm - std.km) > std.toleranceKm) continue;

    // Buscar PR existente
    const { data: existing } = await supabase
      .from('cardio_records')
      .select('best_time_seconds')
      .eq('user_id', session.user_id)
      .eq('discipline', session.discipline)
      .eq('distance_label', std.label)
      .maybeSingle();

    if (!existing || session.duration_seconds < existing.best_time_seconds) {
      const upsertRow = {
        user_id: session.user_id,
        discipline: session.discipline,
        distance_label: std.label,
        best_time_seconds: session.duration_seconds,
        achieved_at: session.date,
        session_id: session.id,
      };

      const { error: upsertErr } = await supabase
        .from('cardio_records')
        .upsert(upsertRow, { onConflict: 'user_id,discipline,distance_label' });

      if (!upsertErr) {
        newPRs.push({ distance_label: std.label, time_seconds: session.duration_seconds });
      }
    }
  }

  return newPRs;
}

/** Ultima sesion por disciplina (para mostrar en el hub). */
export async function getLastCardioSessions(): Promise<Record<CardioDiscipline, CardioSession | null>> {
  const empty: Record<CardioDiscipline, CardioSession | null> = {
    running: null, cycling: null, swimming: null, rowing: null, other: null,
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data } = await supabase
      .from('cardio_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50);

    if (!data) return empty;

    const result = { ...empty };
    for (const row of data as CardioSession[]) {
      const d = row.discipline as CardioDiscipline;
      if (!result[d]) result[d] = row;
    }
    return result;
  } catch {
    return empty;
  }
}

/** PRs de cardio agrupados por disciplina. */
export async function getCardioRecordsByDiscipline(): Promise<Record<CardioDiscipline, CardioRecord[]>> {
  const empty: Record<CardioDiscipline, CardioRecord[]> = {
    running: [], cycling: [], swimming: [], rowing: [], other: [],
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data } = await supabase
      .from('cardio_records')
      .select('id, discipline, distance_label, best_time_seconds, achieved_at')
      .eq('user_id', user.id)
      .order('best_time_seconds', { ascending: true });

    if (!data) return empty;

    const result = { ...empty };
    for (const row of data as CardioRecord[]) {
      const d = row.discipline as CardioDiscipline;
      if (!result[d]) result[d] = [];
      result[d].push(row);
    }
    return result;
  } catch {
    return empty;
  }
}

// === MOVILIDAD ===

export interface MobilityAssessment {
  id: string;
  date: string;
  deep_squat: number | null;
  overhead_squat: number | null;
  toe_touch_cm: number | null;
  shoulder_rotation_l: number | null;
  shoulder_rotation_r: number | null;
  hip_flexion_l: number | null;
  hip_flexion_r: number | null;
  ankle_dorsiflexion_l_cm: number | null;
  ankle_dorsiflexion_r_cm: number | null;
  thoracic_rotation_l: number | null;
  thoracic_rotation_r: number | null;
  overall_score: number | null;
  notes: string | null;
}

export async function getLastMobilityAssessment(): Promise<MobilityAssessment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('mobility_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as MobilityAssessment) ?? null;
  } catch {
    return null;
  }
}

// === HELPERS DE FORMATO ===

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
