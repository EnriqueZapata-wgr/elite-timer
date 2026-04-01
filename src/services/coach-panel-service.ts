/**
 * Coach Panel Service — Queries para el panel web de coach.
 *
 * Aprovecha RLS: el coach puede ver datos de sus clientes activos.
 */
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// === AUTH ===

async function getAuthenticatedUser(): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) throw new Error('Sesión expirada');
  return data.user;
}

// === TYPES ===

export interface ClientSummary {
  client_id: string;
  full_name: string;
  email: string;
  connected_at: string;
  sessions_this_month: number;
  last_workout: string | null;
  last_consultation: string | null;
}

export interface ClientStats {
  sessions_this_month: number;
  volume_kg: number;
  total_prs: number;
  streak_days: number;
  conditions_present: number;
  conditions_observation: number;
  total_consultations: number;
  compliance_pct: number;
}

export interface ClientScheduleItem {
  id: string;
  routine_id: string;
  routine_name: string;
  schedule_type: string;
  day_of_week: number | null;
  specific_date: string | null;
  assigned_by: string | null;
}

export interface ClientRoutine {
  id: string;
  name: string;
  mode: string;
  original_creator_id: string | null;
  created_at: string;
}

export interface ClientPR {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  rep_range: number;
  weight_kg: number;
  estimated_1rm: number;
  achieved_at: string;
}

export interface ClientSession {
  date: string;
  exercises: number;
  sets: number;
  volume_kg: number;
}

// === QUERIES ===

/** Perfil del coach logueado (nombre, email) */
export async function getCoachProfile(): Promise<{ full_name: string; email: string }> {
  const user = await getAuthenticatedUser();
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();
  return {
    full_name: data?.full_name ?? user.email?.split('@')[0] ?? 'Coach',
    email: data?.email ?? user.email ?? '',
  };
}

/** Lista de clientes del coach con stats resumidos */
export async function getClientList(): Promise<ClientSummary[]> {
  const user = await getAuthenticatedUser();

  const { data: connections, error } = await supabase
    .from('coach_clients')
    .select('client_id, connected_at, client:profiles!coach_clients_client_id_fkey(full_name, email)')
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .order('connected_at', { ascending: false });

  if (error) throw error;
  if (!connections || connections.length === 0) return [];

  const clientIds = connections.map(c => c.client_id);

  // Stats del mes actual para todos los clientes (batch)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: logs } = await supabase
    .from('exercise_logs')
    .select('user_id, logged_at')
    .in('user_id', clientIds)
    .gte('logged_at', startOfMonth.toISOString());

  // Última consulta por cliente
  const { data: consults } = await supabase
    .from('consultations')
    .select('client_id, date')
    .in('client_id', clientIds)
    .order('date', { ascending: false });

  const statsByClient = new Map<string, { sessions: Set<string>; lastWorkout: string | null; lastConsult: string | null }>();
  for (const log of (logs ?? [])) {
    const dateStr = new Date(log.logged_at).toISOString().split('T')[0];
    if (!statsByClient.has(log.user_id)) {
      statsByClient.set(log.user_id, { sessions: new Set(), lastWorkout: null, lastConsult: null });
    }
    const entry = statsByClient.get(log.user_id)!;
    entry.sessions.add(dateStr);
    if (!entry.lastWorkout || log.logged_at > entry.lastWorkout) {
      entry.lastWorkout = log.logged_at;
    }
  }
  // Mapear consultas (solo la más reciente por cliente)
  for (const c of (consults ?? [])) {
    if (!statsByClient.has(c.client_id)) {
      statsByClient.set(c.client_id, { sessions: new Set(), lastWorkout: null, lastConsult: null });
    }
    const entry = statsByClient.get(c.client_id)!;
    if (!entry.lastConsult) entry.lastConsult = c.date; // ya está ordenado desc
  }

  return connections.map(c => ({
    client_id: c.client_id,
    full_name: (c as any).client?.full_name ?? 'Cliente',
    email: (c as any).client?.email ?? '',
    connected_at: c.connected_at,
    sessions_this_month: statsByClient.get(c.client_id)?.sessions.size ?? 0,
    last_workout: statsByClient.get(c.client_id)?.lastWorkout ?? null,
    last_consultation: statsByClient.get(c.client_id)?.lastConsult ?? null,
  }));
}

/** Stats completos de un cliente */
export async function getClientDetail(clientId: string): Promise<ClientStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Sesiones y volumen este mes
  const { data: logs } = await supabase
    .from('exercise_logs')
    .select('logged_at, weight_kg, reps')
    .eq('user_id', clientId)
    .gte('logged_at', startOfMonth.toISOString());

  const sessionDates = new Set<string>();
  let volumeKg = 0;
  for (const log of (logs ?? [])) {
    sessionDates.add(new Date(log.logged_at).toISOString().split('T')[0]);
    volumeKg += (log.weight_kg ?? 0) * (log.reps ?? 0);
  }

  // PRs totales
  const { count: totalPrs } = await supabase
    .from('personal_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', clientId);

  // Racha (días consecutivos con sesión)
  const { data: recentLogs } = await supabase
    .from('exercise_logs')
    .select('logged_at')
    .eq('user_id', clientId)
    .order('logged_at', { ascending: false })
    .limit(200);

  let streak = 0;
  if (recentLogs && recentLogs.length > 0) {
    const dates = [...new Set(
      recentLogs.map(l => new Date(l.logged_at).toISOString().split('T')[0])
    )].sort().reverse();

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff <= 1.5) streak++;
        else break;
      }
    }
  }

  // Condiciones activas
  const { data: flagsData } = await supabase
    .from('condition_flags')
    .select('status')
    .eq('user_id', clientId);
  const condPresent = (flagsData ?? []).filter(f => f.status === 'present').length;
  const condObs = (flagsData ?? []).filter(f => f.status === 'observation').length;

  // Total consultas
  const { count: totalConsults } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);

  // Compliance del protocolo este mes
  let compliancePct = 0;
  try {
    const { data: compData } = await supabase
      .from('protocol_completions')
      .select('id')
      .eq('user_id', clientId)
      .gte('completion_date', startOfMonth.toISOString().split('T')[0]);
    const { count: totalItems } = await supabase
      .from('protocol_items')
      .select('id', { count: 'exact', head: true })
      .in('protocol_id', (
        await supabase.from('protocol_assignments').select('protocol_id').eq('user_id', clientId).eq('is_active', true)
      ).data?.map((a: any) => a.protocol_id) ?? []);
    const daysInMonth = new Date().getDate();
    const expectedTotal = (totalItems ?? 0) * daysInMonth;
    const completedTotal = compData?.length ?? 0;
    compliancePct = expectedTotal > 0 ? Math.round((completedTotal / expectedTotal) * 100) : 0;
  } catch { /* tabla puede no existir */ }

  return {
    sessions_this_month: sessionDates.size,
    volume_kg: Math.round(volumeKg),
    total_prs: totalPrs ?? 0,
    streak_days: streak,
    conditions_present: condPresent,
    conditions_observation: condObs,
    total_consultations: totalConsults ?? 0,
    compliance_pct: compliancePct,
  };
}

/** Rutinas programadas del cliente */
export async function getClientSchedule(clientId: string): Promise<ClientScheduleItem[]> {
  const { data, error } = await supabase
    .from('scheduled_routines')
    .select('id, routine_id, schedule_type, day_of_week, specific_date, assigned_by, routines(name)')
    .eq('user_id', clientId)
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    routine_id: row.routine_id,
    routine_name: (row as any).routines?.name ?? 'Rutina',
    schedule_type: row.schedule_type,
    day_of_week: row.day_of_week,
    specific_date: row.specific_date,
    assigned_by: row.assigned_by,
  }));
}

/** Rutinas del cliente */
export async function getClientRoutines(clientId: string): Promise<ClientRoutine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, mode, original_creator_id, created_at')
    .eq('creator_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** PRs del cliente */
export async function getClientPRs(clientId: string): Promise<ClientPR[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_id, rep_range, weight_kg, estimated_1rm, achieved_at, exercises(name, muscle_group)')
    .eq('user_id', clientId)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => ({
    exercise_id: row.exercise_id,
    exercise_name: (row as any).exercises?.name ?? 'Ejercicio',
    muscle_group: (row as any).exercises?.muscle_group ?? '',
    rep_range: row.rep_range,
    weight_kg: row.weight_kg,
    estimated_1rm: row.estimated_1rm,
    achieved_at: row.achieved_at,
  }));
}

/** Últimas sesiones del cliente agrupadas por fecha */
export async function getClientHistory(clientId: string, limit = 20): Promise<ClientSession[]> {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('logged_at, exercise_id, weight_kg, reps')
    .eq('user_id', clientId)
    .order('logged_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const byDate = new Map<string, { exercises: Set<string>; sets: number; volume: number }>();
  for (const log of data) {
    const date = new Date(log.logged_at).toISOString().split('T')[0];
    if (!byDate.has(date)) byDate.set(date, { exercises: new Set(), sets: 0, volume: 0 });
    const entry = byDate.get(date)!;
    entry.exercises.add(log.exercise_id);
    entry.sets++;
    entry.volume += (log.weight_kg ?? 0) * (log.reps ?? 0);
  }

  return Array.from(byDate.entries())
    .slice(0, limit)
    .map(([date, d]) => ({
      date,
      exercises: d.exercises.size,
      sets: d.sets,
      volume_kg: Math.round(d.volume),
    }));
}

/** Rutinas del coach (para asignar a clientes) */
export async function getCoachRoutines(): Promise<ClientRoutine[]> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, mode, original_creator_id, created_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Asignar rutina del coach a un cliente */
export async function assignRoutineToClient(
  clientId: string,
  routineId: string,
  scheduleType: 'weekly_cycle' | 'specific_date',
  dayOfWeek?: number,
  specificDate?: string,
): Promise<string> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase.rpc('assign_routine_to_client', {
    p_coach_id: user.id,
    p_client_id: clientId,
    p_routine_id: routineId,
    p_schedule_type: scheduleType,
    p_day_of_week: dayOfWeek ?? null,
    p_specific_date: specificDate ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
