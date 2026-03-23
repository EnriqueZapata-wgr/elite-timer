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
