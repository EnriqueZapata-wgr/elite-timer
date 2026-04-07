/**
 * Reports Service — Agregaciones para la pantalla de reportes (estilo Oura).
 *
 * Para cada metrica devuelve una serie diaria + estadisticas resumen,
 * acotada al periodo solicitado (semana / mes / 3 meses / todo).
 */
import { supabase } from '@/src/lib/supabase';

export type ReportPeriod = 'week' | 'month' | '3month' | 'all';

export interface DailyPoint {
  date: string;       // YYYY-MM-DD
  label: string;      // dia/mes corto
  value: number;
}

export interface NutritionReport {
  daily: DailyPoint[];
  avgCalories: number;
  avgProtein: number;
  avgScore: number;
}

export interface HydrationReport {
  daily: DailyPoint[];
  avgMl: number;
}

export interface ExerciseReport {
  sessionsPerWeek: number;
  totalVolumeKg: number;
  prsThisPeriod: number;
  cardioSessions: number;
}

export interface ComplianceReport {
  daily: DailyPoint[];
  avgPct: number;
}

// === HELPERS ===

function periodDays(period: ReportPeriod): number {
  switch (period) {
    case 'week': return 7;
    case 'month': return 30;
    case '3month': return 90;
    case 'all': return 365;
  }
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function shortLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function buildDateRange(days: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push(isoDate(d));
  }
  return result;
}

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// === NUTRICION ===

export async function getNutritionReport(period: ReportPeriod): Promise<NutritionReport> {
  const empty: NutritionReport = { daily: [], avgCalories: 0, avgProtein: 0, avgScore: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const days = periodDays(period);
    const dateRange = buildDateRange(days);
    const startDate = dateRange[0];

    const { data } = await supabase
      .from('food_logs')
      .select('date, calories, protein_g, score')
      .eq('user_id', userId)
      .gte('date', startDate);

    // Agrupar por fecha
    const byDate = new Map<string, { calories: number; protein: number; scores: number[]; count: number }>();
    for (const row of (data ?? []) as any[]) {
      const key = row.date;
      const existing = byDate.get(key) ?? { calories: 0, protein: 0, scores: [], count: 0 };
      existing.calories += row.calories ?? 0;
      existing.protein += row.protein_g ?? 0;
      if (row.score != null) existing.scores.push(row.score);
      existing.count += 1;
      byDate.set(key, existing);
    }

    const daily: DailyPoint[] = dateRange.map(d => ({
      date: d,
      label: shortLabel(d),
      value: byDate.get(d)?.calories ?? 0,
    }));

    const totals = Array.from(byDate.values());
    const daysWithData = totals.length;
    const avgCalories = daysWithData > 0
      ? Math.round(totals.reduce((s, t) => s + t.calories, 0) / daysWithData)
      : 0;
    const avgProtein = daysWithData > 0
      ? Math.round(totals.reduce((s, t) => s + t.protein, 0) / daysWithData)
      : 0;
    const allScores = totals.flatMap(t => t.scores);
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((s, n) => s + n, 0) / allScores.length)
      : 0;

    return { daily, avgCalories, avgProtein, avgScore };
  } catch {
    return empty;
  }
}

// === HIDRATACION ===

export async function getHydrationReport(period: ReportPeriod): Promise<HydrationReport> {
  const empty: HydrationReport = { daily: [], avgMl: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const days = periodDays(period);
    const dateRange = buildDateRange(days);
    const startDate = dateRange[0];

    const { data } = await supabase
      .from('hydration_logs')
      .select('date, total_ml')
      .eq('user_id', userId)
      .gte('date', startDate);

    const byDate = new Map<string, number>();
    for (const row of (data ?? []) as any[]) {
      byDate.set(row.date, row.total_ml ?? 0);
    }

    const daily: DailyPoint[] = dateRange.map(d => ({
      date: d,
      label: shortLabel(d),
      value: byDate.get(d) ?? 0,
    }));

    const valuesWithData = Array.from(byDate.values()).filter(v => v > 0);
    const avgMl = valuesWithData.length > 0
      ? Math.round(valuesWithData.reduce((s, v) => s + v, 0) / valuesWithData.length)
      : 0;

    return { daily, avgMl };
  } catch {
    return empty;
  }
}

// === EJERCICIO ===

export async function getExerciseReport(period: ReportPeriod): Promise<ExerciseReport> {
  const empty: ExerciseReport = { sessionsPerWeek: 0, totalVolumeKg: 0, prsThisPeriod: 0, cardioSessions: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const days = periodDays(period);
    const startDate = buildDateRange(days)[0];
    const startISO = new Date(startDate + 'T00:00:00').toISOString();

    const [execRes, logsRes, prsRes, cardioRes] = await Promise.all([
      supabase.from('execution_logs').select('id').eq('user_id', userId).gte('started_at', startISO),
      supabase.from('exercise_logs').select('reps, weight_kg').eq('user_id', userId).gte('logged_at', startISO),
      supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('achieved_at', startDate),
      supabase.from('cardio_sessions').select('id').eq('user_id', userId).gte('date', startDate),
    ]);

    const sessions = execRes.data?.length ?? 0;
    const sessionsPerWeek = days > 0 ? Math.round((sessions / days) * 7 * 10) / 10 : 0;

    const totalVolumeKg = (logsRes.data ?? []).reduce((sum: number, r: any) => {
      if (r.weight_kg && r.weight_kg > 0 && r.reps > 0) return sum + r.reps * r.weight_kg;
      return sum;
    }, 0);

    return {
      sessionsPerWeek,
      totalVolumeKg: Math.round(totalVolumeKg),
      prsThisPeriod: prsRes.count ?? 0,
      cardioSessions: cardioRes.data?.length ?? 0,
    };
  } catch {
    return empty;
  }
}

// === COMPLIANCE ===

export async function getComplianceReport(period: ReportPeriod): Promise<ComplianceReport> {
  const empty: ComplianceReport = { daily: [], avgPct: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const days = periodDays(period);
    const dateRange = buildDateRange(days);
    const startDate = dateRange[0];

    const { data } = await supabase
      .from('daily_plans')
      .select('date, compliance_pct')
      .eq('user_id', userId)
      .gte('date', startDate);

    const byDate = new Map<string, number>();
    for (const row of (data ?? []) as any[]) {
      byDate.set(row.date, row.compliance_pct ?? 0);
    }

    const daily: DailyPoint[] = dateRange.map(d => ({
      date: d,
      label: shortLabel(d),
      value: byDate.get(d) ?? 0,
    }));

    const valuesWithData = Array.from(byDate.values()).filter(v => v > 0);
    const avgPct = valuesWithData.length > 0
      ? Math.round(valuesWithData.reduce((s, v) => s + v, 0) / valuesWithData.length)
      : 0;

    return { daily, avgPct };
  } catch {
    return empty;
  }
}
