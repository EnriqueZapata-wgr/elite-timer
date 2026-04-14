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

export interface FastingReport {
  totalFasts: number;
  avgHours: number;
  longestFast: number;
  fastsPerWeek: number;
  daily: DailyPoint[]; // horas reales por dia
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

// === AYUNO ===

export async function getFastingReport(period: ReportPeriod): Promise<FastingReport> {
  const empty: FastingReport = { totalFasts: 0, avgHours: 0, longestFast: 0, fastsPerWeek: 0, daily: [] };
  try {
    const userId = await getUserId();
    if (!userId) return empty;

    const days = periodDays(period);
    const dateRange = buildDateRange(days);
    const startDate = dateRange[0];

    const { data } = await supabase
      .from('fasting_logs')
      .select('date, actual_hours, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('date', startDate);

    const byDate = new Map<string, number>();
    for (const row of (data ?? []) as any[]) {
      const hours = row.actual_hours ?? 0;
      const prev = byDate.get(row.date) ?? 0;
      // Si hay varios ayunos en el mismo dia, nos quedamos con el mas largo
      if (hours > prev) byDate.set(row.date, hours);
    }

    const daily: DailyPoint[] = dateRange.map(d => ({
      date: d,
      label: shortLabel(d),
      value: byDate.get(d) ?? 0,
    }));

    const allHours = Array.from(byDate.values());
    const totalFasts = allHours.length;
    const avgHours = totalFasts > 0
      ? Math.round((allHours.reduce((s, h) => s + h, 0) / totalFasts) * 10) / 10
      : 0;
    const longestFast = totalFasts > 0 ? Math.max(...allHours) : 0;
    const fastsPerWeek = days > 0 ? Math.round((totalFasts / days) * 7 * 10) / 10 : 0;

    return { totalFasts, avgHours, longestFast, fastsPerWeek, daily };
  } catch {
    return empty;
  }
}

// === ELECTRONES ===

export interface ElectronReport {
  daily: DailyPoint[];
  avgPerDay: number;
  total: number;
  bestDay: number;
}

export async function getElectronReport(period: ReportPeriod): Promise<ElectronReport> {
  const empty: ElectronReport = { daily: [], avgPerDay: 0, total: 0, bestDay: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;
    const days = periodDays(period);
    const dateRange = buildDateRange(days);
    const startDate = dateRange[0];

    const { data } = await supabase.from('electron_logs').select('date, electrons')
      .eq('user_id', userId).gte('date', startDate);

    const byDate = new Map<string, number>();
    for (const row of (data ?? []) as any[]) {
      const prev = byDate.get(row.date) ?? 0;
      byDate.set(row.date, prev + Number(row.electrons ?? 0));
    }

    const daily: DailyPoint[] = dateRange.map(d => ({
      date: d, label: shortLabel(d), value: Math.round((byDate.get(d) ?? 0) * 10) / 10,
    }));

    const vals = Array.from(byDate.values());
    const total = vals.reduce((s, v) => s + v, 0);
    const avgPerDay = vals.length > 0 ? Math.round((total / vals.length) * 10) / 10 : 0;
    const bestDay = vals.length > 0 ? Math.round(Math.max(...vals) * 10) / 10 : 0;

    return { daily, avgPerDay, total: Math.round(total * 10) / 10, bestDay };
  } catch { return empty; }
}

// === GLUCOSA ===

export interface GlucoseReport {
  daily: DailyPoint[];
  avgFasting: number;
  avgPostMeal: number;
  readings: number;
}

export async function getGlucoseReport(period: ReportPeriod): Promise<GlucoseReport> {
  const empty: GlucoseReport = { daily: [], avgFasting: 0, avgPostMeal: 0, readings: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;
    const days = periodDays(period);
    const startDate = buildDateRange(days)[0];

    const { data } = await supabase.from('glucose_logs')
      .select('date, value_mg_dl, context')
      .eq('user_id', userId).gte('date', startDate).order('date');

    if (!data || data.length === 0) return empty;

    const daily: DailyPoint[] = [];
    const byDate = new Map<string, number[]>();
    const fastingVals: number[] = [];
    const postMealVals: number[] = [];

    for (const row of data as any[]) {
      const vals = byDate.get(row.date) ?? [];
      vals.push(row.value_mg_dl);
      byDate.set(row.date, vals);
      if (row.context === 'fasting') fastingVals.push(row.value_mg_dl);
      if (row.context?.startsWith('post_meal')) postMealVals.push(row.value_mg_dl);
    }

    for (const [date, vals] of byDate.entries()) {
      daily.push({ date, label: shortLabel(date), value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) });
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return { daily, avgFasting: avg(fastingVals), avgPostMeal: avg(postMealVals), readings: data.length };
  } catch { return empty; }
}

// ═══ MENTE ═══

export interface MindReport {
  breathingSessions: number;
  meditationSessions: number;
  totalMinutes: number;
  journalEntries: number;
  checkins: number;
}

export async function getMindReport(period: ReportPeriod): Promise<MindReport> {
  const empty: MindReport = { breathingSessions: 0, meditationSessions: 0, totalMinutes: 0, journalEntries: 0, checkins: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;
    const days = periodDays(period);
    const startDate = buildDateRange(days)[0];

    const [mindRes, journalRes, checkinRes] = await Promise.all([
      supabase.from('mind_sessions').select('type, duration_seconds').eq('user_id', userId).gte('date', startDate),
      supabase.from('journal_entries').select('id').eq('user_id', userId).gte('date', startDate),
      supabase.from('emotional_checkins').select('id').eq('user_id', userId).gte('created_at', new Date(Date.now() - days * 86400000).toISOString()),
    ]);

    const sessions = mindRes.data ?? [];
    const breathing = sessions.filter((s: any) => s.type === 'breathing');
    const meditation = sessions.filter((s: any) => s.type === 'meditation');
    const totalSecs = sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds ?? 0), 0);

    return {
      breathingSessions: breathing.length,
      meditationSessions: meditation.length,
      totalMinutes: Math.round(totalSecs / 60),
      journalEntries: journalRes.data?.length ?? 0,
      checkins: checkinRes.data?.length ?? 0,
    };
  } catch { return empty; }
}

// ═══ CICLO ═══

export interface CycleReport {
  periodDays: number;
  avgEnergy: number;
  avgMood: number;
  logsCount: number;
}

export async function getCycleReport(period: ReportPeriod): Promise<CycleReport> {
  const empty: CycleReport = { periodDays: 0, avgEnergy: 0, avgMood: 0, logsCount: 0 };
  try {
    const userId = await getUserId();
    if (!userId) return empty;
    const days = periodDays(period);
    const startDate = buildDateRange(days)[0];

    const { data } = await supabase.from('cycle_daily_logs')
      .select('is_period, energy, mood')
      .eq('user_id', userId).gte('date', startDate);

    if (!data || data.length === 0) return empty;

    const pDays = data.filter((d: any) => d.is_period).length;
    const energyVals = data.map((d: any) => d.energy).filter((v: any) => v != null && v > 0);
    const moodVals = data.map((d: any) => d.mood).filter((v: any) => v != null && v > 0);
    const avgE = energyVals.length > 0 ? energyVals.reduce((a: number, b: number) => a + b, 0) / energyVals.length : 0;
    const avgM = moodVals.length > 0 ? moodVals.reduce((a: number, b: number) => a + b, 0) / moodVals.length : 0;

    return { periodDays: pDays, avgEnergy: Math.round(avgE * 10) / 10, avgMood: Math.round(avgM * 10) / 10, logsCount: data.length };
  } catch { return empty; }
}
