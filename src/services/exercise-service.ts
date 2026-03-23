/**
 * Exercise Service — CRUD de ejercicios, logging de sets y PRs contra Supabase.
 *
 * Tablas: exercises, exercise_logs, personal_records
 * El trigger de PRs en la DB actualiza personal_records automáticamente
 * al insertar en exercise_logs con peso mayor al PR actual.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { generateUUID } from '@/src/services/routine-service';

/** Obtiene usuario con refresh automático si la sesión expiró */
async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) {
    throw new Error('Sesión expirada. Cierra sesión e inicia de nuevo.');
  }
  return data.user;
}
import type {
  Exercise,
  ExerciseLog,
  PersonalRecord,
  ExerciseFilters,
  PRFilters,
  LogSetData,
} from '@/src/types/exercise';

// === EJERCICIOS ===

/** Buscar ejercicios con filtros opcionales */
export async function getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    // Mostrar ejercicios públicos + los creados por el usuario
    if (user) {
      query = query.or(`is_public.eq.true,creator_id.eq.${user.id}`);
    } else {
      query = query.eq('is_public', true);
    }

    if (filters?.muscle_group) {
      query = query.eq('muscle_group', filters.muscle_group);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data ?? []) as Exercise[];
  } catch (err) {
    if (__DEV__) console.error('Error al buscar ejercicios:', err);
    throw err;
  }
}

/** Crear un ejercicio custom del usuario */
export async function createExercise(data: {
  name: string;
  muscle_group: string;
  equipment?: string;
  category?: string;
  description?: string;
}): Promise<Exercise> {
  try {
    const user = await getAuthenticatedUser();

    const exercise = {
      id: generateUUID(),
      creator_id: user.id,
      name: data.name.trim(),
      muscle_group: data.muscle_group,
      equipment: data.equipment ?? 'bodyweight',
      category: data.category ?? 'strength',
      description: data.description ?? '',
      is_public: false,
    };

    const { error } = await supabase.from('exercises').insert(exercise);

    if (error) throw new Error(error.message);
    return exercise;
  } catch (err) {
    if (__DEV__) console.error('Error al crear ejercicio:', err);
    throw err;
  }
}

// === LOGGING DE SETS ===

/** Registrar un set de ejercicio (durante ejecución o manual) */
export async function logExerciseSet(data: LogSetData): Promise<void> {
  try {
    const user = await getAuthenticatedUser();

    const row = {
      id: generateUUID(),
      user_id: user.id,
      exercise_id: data.exercise_id,
      execution_log_id: data.execution_log_id ?? null,
      block_id: data.block_id ?? null,
      set_number: data.set_number,
      reps: data.reps,
      weight_kg: data.weight_kg ?? null,
      rpe: data.rpe ?? null,
      rir: data.rir ?? null,
      notes: data.notes ?? '',
      logged_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('exercise_logs').insert(row);

    if (error) throw new Error(error.message);
    // El trigger de la DB actualiza personal_records automáticamente
  } catch (err) {
    if (__DEV__) console.error('Error al registrar set:', err);
    throw err;
  }
}

/** Registrar múltiples sets de un ejercicio (para entrada manual) */
export async function logExerciseSets(sets: LogSetData[]): Promise<void> {
  try {
    const user = await getAuthenticatedUser();

    const rows = sets.map(data => ({
      id: generateUUID(),
      user_id: user.id,
      exercise_id: data.exercise_id,
      execution_log_id: data.execution_log_id ?? null,
      block_id: data.block_id ?? null,
      set_number: data.set_number,
      reps: data.reps,
      weight_kg: data.weight_kg ?? null,
      rpe: data.rpe ?? null,
      rir: data.rir ?? null,
      notes: data.notes ?? '',
      logged_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('exercise_logs').insert(rows);

    if (error) throw new Error(error.message);
  } catch (err) {
    if (__DEV__) console.error('Error al registrar sets:', err);
    throw err;
  }
}

// === HISTORIAL ===

/** Obtener historial de un ejercicio para el usuario actual */
export async function getExerciseHistory(
  exerciseId: string,
  limit = 50,
): Promise<ExerciseLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*, exercises(name)')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row: any) => ({
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercises?.name ?? '',
      set_number: row.set_number,
      reps: row.reps,
      weight_kg: row.weight_kg,
      rpe: row.rpe,
      rir: row.rir ?? null,
      notes: row.notes ?? '',
      logged_at: row.logged_at,
      execution_log_id: row.execution_log_id,
      block_id: row.block_id,
    }));
  } catch (err) {
    if (__DEV__) console.error('Error al obtener historial:', err);
    throw err;
  }
}

// === PERSONAL RECORDS ===

/** Obtener PRs del usuario actual con filtros opcionales */
export async function getPersonalRecords(filters?: PRFilters): Promise<PersonalRecord[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('personal_records')
      .select('*, exercises(name, muscle_group)')
      .eq('user_id', user.id)
      .order('weight_kg', { ascending: false });

    if (filters?.exercise_id) {
      query = query.eq('exercise_id', filters.exercise_id);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    let records = (data ?? []).map((row: any) => ({
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercises?.name ?? '',
      muscle_group: row.exercises?.muscle_group ?? '',
      rep_range: row.rep_range,
      weight_kg: row.weight_kg,
      estimated_1rm: row.estimated_1rm,
      achieved_at: row.achieved_at,
    }));

    // Filtrar por grupo muscular después del join (Supabase no filtra en tablas joineadas fácilmente)
    if (filters?.muscle_group) {
      records = records.filter(r => r.muscle_group === filters.muscle_group);
    }

    return records;
  } catch (err) {
    if (__DEV__) console.error('Error al obtener PRs:', err);
    throw err;
  }
}

/** Obtener PRs de un ejercicio específico (todos los rep ranges) */
export async function getExercisePRs(exerciseId: string): Promise<PersonalRecord[]> {
  return getPersonalRecords({ exercise_id: exerciseId });
}

// === STATS SEMANALES ===

export interface WeeklyStats {
  workouts: number;
  totalSeconds: number;
  volumeKg: number;
  prs: number;
}

/** Stats de la semana actual (lunes a hoy) */
export async function getWeeklyStats(): Promise<WeeklyStats> {
  const empty: WeeklyStats = { workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0 };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    // Lunes de esta semana a las 00:00
    const now = new Date();
    const day = now.getDay(); // 0=Dom, 1=Lun...
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayISO = monday.toISOString();

    // Entrenos + duración total de execution_logs
    const { data: execData } = await supabase
      .from('execution_logs')
      .select('id, total_duration_seconds')
      .eq('user_id', user.id)
      .gte('started_at', mondayISO);

    const workouts = execData?.length ?? 0;
    const totalSeconds = execData?.reduce(
      (sum: number, r: any) => sum + (r.total_duration_seconds ?? 0), 0
    ) ?? 0;

    // Volumen de exercise_logs esta semana
    const { data: logData } = await supabase
      .from('exercise_logs')
      .select('reps, weight_kg')
      .eq('user_id', user.id)
      .gte('logged_at', mondayISO);

    const volumeKg = logData?.reduce((sum: number, r: any) => {
      if (r.weight_kg && r.weight_kg > 0 && r.reps > 0) {
        return sum + (r.reps * r.weight_kg);
      }
      return sum;
    }, 0) ?? 0;

    // PRs de esta semana
    const { count: prCount } = await supabase
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('achieved_at', mondayISO);

    return {
      workouts,
      totalSeconds,
      volumeKg: Math.round(volumeKg),
      prs: prCount ?? 0,
    };
  } catch {
    return empty;
  }
}

/** Verificar si se generó un PR reciente (últimos 5s) para un ejercicio */
export async function checkRecentPR(exerciseId: string): Promise<PersonalRecord | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fiveSecsAgo = new Date(Date.now() - 5000).toISOString();

    const { data, error } = await supabase
      .from('personal_records')
      .select('*, exercises(name, muscle_group)')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .gte('achieved_at', fiveSecsAgo)
      .order('achieved_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const row = data[0] as any;
    return {
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercises?.name ?? '',
      muscle_group: row.exercises?.muscle_group ?? '',
      rep_range: row.rep_range,
      weight_kg: row.weight_kg,
      estimated_1rm: row.estimated_1rm,
      achieved_at: row.achieved_at,
    };
  } catch {
    return null;
  }
}

// === MONTHLY STATS ===

export interface MonthlyStats {
  workouts: number;
  totalSeconds: number;
  volumeKg: number;
  prs: number;
  monthLabel: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export async function getMonthlyStats(): Promise<MonthlyStats> {
  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
  const empty: MonthlyStats = { workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0, monthLabel };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    first.setHours(0, 0, 0, 0);
    const firstISO = first.toISOString();

    const { data: execData } = await supabase
      .from('execution_logs')
      .select('id, total_duration_seconds')
      .eq('user_id', user.id)
      .gte('started_at', firstISO);

    const workouts = execData?.length ?? 0;
    const totalSeconds = execData?.reduce(
      (sum: number, r: any) => sum + (r.total_duration_seconds ?? 0), 0
    ) ?? 0;

    const { data: logData } = await supabase
      .from('exercise_logs')
      .select('reps, weight_kg')
      .eq('user_id', user.id)
      .gte('logged_at', firstISO);

    const volumeKg = logData?.reduce((sum: number, r: any) => {
      if (r.weight_kg && r.weight_kg > 0 && r.reps > 0) return sum + (r.reps * r.weight_kg);
      return sum;
    }, 0) ?? 0;

    const { count: prCount } = await supabase
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('achieved_at', firstISO);

    return { workouts, totalSeconds, volumeKg: Math.round(volumeKg), prs: prCount ?? 0, monthLabel };
  } catch {
    return empty;
  }
}

// === CHART DATA ===

export interface WeekChartData {
  label: string;
  value: number;
  isCurrent: boolean;
}

/** Helper: lunes de una semana dada */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getWeeklyFrequencyChart(weeks = 8): Promise<WeekChartData[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const currentMonday = getMondayOf(now);
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

    const { data } = await supabase
      .from('execution_logs')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', startDate.toISOString());

    const result: WeekChartData[] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = (data ?? []).filter(r => {
        const d = new Date(r.started_at);
        return d >= weekStart && d < weekEnd;
      }).length;

      const isCurrent = weekStart.getTime() === currentMonday.getTime();
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      result.push({ label, value: count, isCurrent });
    }
    return result;
  } catch {
    return [];
  }
}

export async function getWeeklyVolumeChart(weeks = 8): Promise<WeekChartData[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const currentMonday = getMondayOf(now);
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

    const { data } = await supabase
      .from('exercise_logs')
      .select('reps, weight_kg, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString());

    const result: WeekChartData[] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const vol = (data ?? [])
        .filter(r => {
          const d = new Date(r.logged_at);
          return d >= weekStart && d < weekEnd;
        })
        .reduce((sum: number, r: any) => {
          if (r.weight_kg > 0 && r.reps > 0) return sum + r.reps * r.weight_kg;
          return sum;
        }, 0);

      const isCurrent = weekStart.getTime() === currentMonday.getTime();
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      result.push({ label, value: Math.round(vol), isCurrent });
    }
    return result;
  } catch {
    return [];
  }
}

// === RECENT PRs LIST ===

export async function getRecentPRsList(limit = 10): Promise<PersonalRecord[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('personal_records')
      .select('*, exercises(name, muscle_group)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercises?.name ?? '',
      muscle_group: row.exercises?.muscle_group ?? '',
      rep_range: row.rep_range,
      weight_kg: row.weight_kg,
      estimated_1rm: row.estimated_1rm,
      achieved_at: row.achieved_at,
    }));
  } catch {
    return [];
  }
}

// === SESSION HISTORY ===

export interface SessionHistoryEntry {
  id: string;
  routineName: string;
  mode: string;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number;
  status: string;
}

export async function getSessionHistory(limit = 50): Promise<SessionHistoryEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      routineName: row.routine_name ?? 'Sesión',
      mode: row.mode ?? 'timer',
      startedAt: row.started_at,
      completedAt: row.completed_at ?? null,
      totalDurationSeconds: row.total_duration_seconds ?? 0,
      status: row.status ?? 'completed',
    }));
  } catch {
    return [];
  }
}

// === EXERCISE PROGRESSION (Enhanced) ===

/** Epley 1RM estimation */
function calcEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface ProgressionPoint {
  date: string;
  dateLabel: string;
  maxWeight: number;
  estimated1RM: number;
  maxByRepRange: Record<number, number>; // rep_range → max weight
}

export async function getExerciseProgression(exerciseId: string): Promise<ProgressionPoint[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('reps, weight_kg, logged_at')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0)
      .order('logged_at', { ascending: true });

    if (error || !data || data.length === 0) return [];

    // Agrupar por fecha
    const byDate = new Map<string, typeof data>();
    for (const row of data) {
      const dateKey = new Date(row.logged_at).toISOString().split('T')[0];
      const existing = byDate.get(dateKey) ?? [];
      existing.push(row);
      byDate.set(dateKey, existing);
    }

    return Array.from(byDate.entries()).map(([date, rows]) => {
      const d = new Date(date);
      let maxWeight = 0;
      let estimated1RM = 0;
      const maxByRepRange: Record<number, number> = {};

      for (const r of rows) {
        if (r.weight_kg > maxWeight) maxWeight = r.weight_kg;
        const e1rm = calcEpley(r.weight_kg, r.reps);
        if (e1rm > estimated1RM) estimated1RM = e1rm;

        // Agrupar por rep range: 1, 3, 5, 8-10 (normalizar 8-10 como 8)
        const rr = r.reps <= 2 ? 1 : r.reps <= 4 ? 3 : r.reps <= 6 ? 5 : 8;
        if (!maxByRepRange[rr] || r.weight_kg > maxByRepRange[rr]) {
          maxByRepRange[rr] = r.weight_kg;
        }
      }

      return {
        date,
        dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        maxWeight,
        estimated1RM: Math.round(estimated1RM * 10) / 10,
        maxByRepRange,
      };
    });
  } catch {
    return [];
  }
}

// === EXERCISE SESSION HISTORY ===

export interface ExerciseSessionEntry {
  date: string;
  dateLabel: string;
  sets: { reps: number; weight_kg: number; rir: number | null }[];
  maxWeight: number;
  estimated1RM: number;
}

export async function getExerciseSessionHistory(exerciseId: string): Promise<ExerciseSessionEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('reps, weight_kg, rir, logged_at, set_number')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('logged_at', { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) return [];

    // Agrupar por fecha
    const byDate = new Map<string, typeof data>();
    for (const row of data) {
      const dateKey = new Date(row.logged_at).toISOString().split('T')[0];
      const existing = byDate.get(dateKey) ?? [];
      existing.push(row);
      byDate.set(dateKey, existing);
    }

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    return Array.from(byDate.entries()).map(([date, rows]) => {
      let dateLabel: string;
      if (date === todayKey) dateLabel = 'Hoy';
      else if (date === yesterdayKey) dateLabel = 'Ayer';
      else {
        const d = new Date(date);
        const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        dateLabel = `${d.getDate()} ${monthShort[d.getMonth()]} ${d.getFullYear()}`;
      }

      let maxWeight = 0;
      let estimated1RM = 0;
      const sets = rows
        .sort((a: any, b: any) => (a.set_number ?? 0) - (b.set_number ?? 0))
        .map((r: any) => {
          if (r.weight_kg > maxWeight) maxWeight = r.weight_kg;
          const e = calcEpley(r.weight_kg ?? 0, r.reps ?? 0);
          if (e > estimated1RM) estimated1RM = e;
          return { reps: r.reps, weight_kg: r.weight_kg ?? 0, rir: r.rir ?? null };
        });

      return { date, dateLabel, sets, maxWeight, estimated1RM: Math.round(estimated1RM * 10) / 10 };
    });
  } catch {
    return [];
  }
}

// === TOP EXERCISES ===

export interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  totalSets: number;
  latestEstimated1RM: number;
  trend: 'up' | 'down' | 'stable';
  last5Points: number[]; // últimos 5 valores de 1RM estimado para sparkline
}

export async function getTopExercises(limit = 5): Promise<TopExercise[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('exercise_id, reps, weight_kg, logged_at, exercises(name, muscle_group)')
      .eq('user_id', user.id)
      .gte('logged_at', firstOfMonth.toISOString())
      .not('weight_kg', 'is', null)
      .gt('weight_kg', 0);

    if (error || !data || data.length === 0) return [];

    // Agrupar por exercise_id
    const byExercise = new Map<string, { name: string; mg: string; rows: any[] }>();
    for (const row of data as any[]) {
      const eid = row.exercise_id;
      const existing = byExercise.get(eid);
      if (existing) {
        existing.rows.push(row);
      } else {
        byExercise.set(eid, {
          name: row.exercises?.name ?? '',
          mg: row.exercises?.muscle_group ?? '',
          rows: [row],
        });
      }
    }

    // Calcular stats y ordenar por total sets
    const results: TopExercise[] = [];
    for (const [eid, { name, mg, rows }] of byExercise.entries()) {
      const totalSets = rows.length;

      // Agrupar por fecha para calcular 1RM por día
      const byDate = new Map<string, number>();
      for (const r of rows) {
        const dk = new Date(r.logged_at).toISOString().split('T')[0];
        const e1rm = calcEpley(r.weight_kg, r.reps);
        const current = byDate.get(dk) ?? 0;
        if (e1rm > current) byDate.set(dk, e1rm);
      }

      const dailyValues = Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, v]) => Math.round(v * 10) / 10);

      const latest = dailyValues[dailyValues.length - 1] ?? 0;
      const prev = dailyValues.length >= 2 ? dailyValues[dailyValues.length - 2] : latest;
      const trend: 'up' | 'down' | 'stable' = latest > prev ? 'up' : latest < prev ? 'down' : 'stable';
      const last5 = dailyValues.slice(-5);

      results.push({
        exerciseId: eid,
        exerciseName: name,
        muscleGroup: mg,
        totalSets,
        latestEstimated1RM: latest,
        trend,
        last5Points: last5,
      });
    }

    return results.sort((a, b) => b.totalSets - a.totalSets).slice(0, limit);
  } catch {
    return [];
  }
}

/** Obtener el último peso usado para un ejercicio (del log más reciente con peso) */
export async function getLastWeight(exerciseId: string): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('weight_kg')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .not('weight_kg', 'is', null)
      .order('logged_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0].weight_kg;
  } catch {
    return null;
  }
}
