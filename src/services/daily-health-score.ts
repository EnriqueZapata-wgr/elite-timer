/**
 * Daily Health Score — Calcula un score diario de salud (0-100)
 * a partir de 6 componentes: sueño, actividad, nutrición, estrés,
 * recuperación y cumplimiento de protocolo.
 *
 * Usa datos existentes de Supabase (health_measurements, food_logs).
 * Todos los queries están envueltos en try/catch para degradar
 * graciosamente si alguna tabla no existe.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';

// === INTERFACES ===

export interface HealthScoreComponent {
  score: number;      // 0-100
  source: string;     // e.g., 'Manual', 'Sin datos'
  detail: string;     // e.g., '7.5h registradas'
}

export interface DailyHealthScore {
  date: string;
  overall: number;    // 0-100
  level: string;      // 'Bajo' | 'Regular' | 'Bueno' | 'Excelente' | 'Óptimo'
  color: string;      // verde/ámbar/rojo
  components: {
    sleep: HealthScoreComponent;
    activity: HealthScoreComponent;
    nutrition: HealthScoreComponent;
    stress: HealthScoreComponent;
    recovery: HealthScoreComponent;
    compliance: HealthScoreComponent;
  };
}

// === PESOS DE CADA COMPONENTE ===

const WEIGHTS = {
  sleep: 0.25,
  activity: 0.20,
  nutrition: 0.20,
  stress: 0.15,
  recovery: 0.10,
  compliance: 0.10,
} as const;

// === HELPERS INTERNOS ===

/** Fecha de hoy en formato YYYY-MM-DD */
function todayISO(): string {
  return getLocalToday();
}

/** Determina nivel textual a partir del score */
function scoreLevel(score: number): string {
  if (score >= 85) return 'Óptimo';
  if (score >= 70) return 'Excelente';
  if (score >= 55) return 'Bueno';
  if (score >= 40) return 'Regular';
  return 'Bajo';
}

/** Determina color a partir del score */
function scoreColor(score: number): string {
  if (score >= 70) return '#A8E02A'; // lime/verde neón
  if (score >= 40) return '#EF9F27'; // ámbar
  return '#E24B4A';                  // rojo
}

// === CÁLCULO DE CADA COMPONENTE ===

/** Sueño: basado en horas de sueño o calidad registrada */
async function calcSleep(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data } = await supabase
      .from('health_measurements')
      .select('sleep_hours, sleep_quality')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .single();

    if (data?.sleep_hours) {
      const h = data.sleep_hours;
      const score = h >= 8 ? 90 : h >= 7 ? 75 : h >= 6 ? 50 : 25;
      return { score, source: 'Manual', detail: `${h}h registradas` };
    }

    if (data?.sleep_quality) {
      // sleep_quality es 1-10, mapear a 0-100
      const score = Math.round(data.sleep_quality * 10);
      return { score, source: 'Manual', detail: `Calidad ${data.sleep_quality}/10` };
    }
  } catch { /* tabla no existe o error de query */ }

  return { score: 50, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Actividad: basada en pasos diarios */
async function calcActivity(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data } = await supabase
      .from('health_measurements')
      .select('steps_daily')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .single();

    if (data?.steps_daily) {
      const s = data.steps_daily;
      const score = s >= 10000 ? 90 : s >= 7500 ? 70 : s >= 5000 ? 50 : 25;
      const formatted = s >= 1000 ? `${(s / 1000).toFixed(1)}k` : `${s}`;
      return { score, source: 'Manual', detail: `${formatted} pasos` };
    }
  } catch { /* silenciar */ }

  return { score: 30, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Nutrición: promedio de quality_score de food_logs del día */
async function calcNutrition(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data } = await supabase
      .from('food_logs')
      .select('quality_score')
      .eq('user_id', userId)
      .gte('date', today)
      .lt('date', today + 'T23:59:59');

    if (data && data.length > 0) {
      const scores = data.filter((d: any) => d.quality_score != null).map((d: any) => d.quality_score);
      if (scores.length > 0) {
        const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        return { score: Math.min(100, avg), source: 'Registros', detail: `${data.length} comida${data.length > 1 ? 's' : ''} hoy` };
      }
    }
  } catch { /* silenciar */ }

  return { score: 50, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Estrés: basado en stress_level (1-10, invertido — menor es mejor) */
async function calcStress(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data } = await supabase
      .from('health_measurements')
      .select('stress_level')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .single();

    if (data?.stress_level) {
      // stress_level 1-10: invertir para que bajo estrés = alto score
      const inverted = 11 - data.stress_level;
      const score = Math.round(inverted * 10);
      return { score, source: 'Manual', detail: `Nivel ${data.stress_level}/10` };
    }
  } catch { /* silenciar */ }

  return { score: 60, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Recuperación: basada en frecuencia cardíaca en reposo */
async function calcRecovery(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    // Buscar medición de hoy o la más reciente
    const { data } = await supabase
      .from('health_measurements')
      .select('resting_hr')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (data?.resting_hr) {
      const hr = data.resting_hr;
      const score = hr < 55 ? 90 : hr < 65 ? 75 : hr < 75 ? 55 : 35;
      return { score, source: 'Manual', detail: `${hr} bpm en reposo` };
    }
  } catch { /* silenciar */ }

  return { score: 60, source: 'Sin datos', detail: 'Sin registro' };
}

/** Cumplimiento de protocolo: busca tabla daily_plan, si no existe retorna default */
async function calcCompliance(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('completed_tasks, total_tasks')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .single();

    if (!error && data && data.total_tasks > 0) {
      const pct = Math.round((data.completed_tasks / data.total_tasks) * 100);
      return { score: pct, source: 'Protocolo', detail: `${data.completed_tasks}/${data.total_tasks} tareas` };
    }
  } catch { /* tabla no existe — silenciar */ }

  return { score: 0, source: 'Sin protocolo', detail: 'Sin plan activo' };
}

// === FUNCIÓN PRINCIPAL ===

/**
 * Calcula el Daily Health Score completo para un usuario.
 * Todas las queries están protegidas con try/catch — si falla,
 * usa valores default y no rompe la app.
 */
export async function calculateDailyHealthScore(userId: string): Promise<DailyHealthScore> {
  const today = todayISO();

  // Ejecutar todos los componentes en paralelo
  const [sleep, activity, nutrition, stress, recovery, compliance] = await Promise.all([
    calcSleep(userId, today),
    calcActivity(userId, today),
    calcNutrition(userId, today),
    calcStress(userId, today),
    calcRecovery(userId, today),
    calcCompliance(userId, today),
  ]);

  // Score ponderado
  const overall = Math.round(
    sleep.score * WEIGHTS.sleep +
    activity.score * WEIGHTS.activity +
    nutrition.score * WEIGHTS.nutrition +
    stress.score * WEIGHTS.stress +
    recovery.score * WEIGHTS.recovery +
    compliance.score * WEIGHTS.compliance,
  );

  return {
    date: today,
    overall,
    level: scoreLevel(overall),
    color: scoreColor(overall),
    components: { sleep, activity, nutrition, stress, recovery, compliance },
  };
}
