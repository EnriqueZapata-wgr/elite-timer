/**
 * Daily Health Score — Calcula un score diario de salud (0-100)
 * a partir de 6 componentes: sueño, actividad, nutrición, estrés,
 * recuperación y cumplimiento de protocolo.
 *
 * Usa datos existentes de Supabase (health_measurements, food_logs).
 * Degrada graciosamente a defaults neutrales, pero SIEMPRE registra el
 * error (supabase no lanza: el 400 viene en { error }, no en el catch —
 * así se corrompió el score en silencio durante semanas, MB-6).
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

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
    const { data, error } = await supabase
      .from('health_measurements')
      .select('sleep_hours, sleep_quality')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();
    if (error) logWarn('[health-score] sleep query failed:', error.message);

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
  } catch (e) { logWarn('[health-score] sleep failed:', e); }

  return { score: 50, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Actividad: basada en pasos diarios */
async function calcActivity(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data, error } = await supabase
      .from('health_measurements')
      .select('steps_daily')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();
    if (error) logWarn('[health-score] activity query failed:', error.message);

    if (data?.steps_daily) {
      const s = data.steps_daily;
      const score = s >= 10000 ? 90 : s >= 7500 ? 70 : s >= 5000 ? 50 : 25;
      const formatted = s >= 1000 ? `${(s / 1000).toFixed(1)}k` : `${s}`;
      return { score, source: 'Manual', detail: `${formatted} pasos` };
    }
  } catch (e) { logWarn('[health-score] activity failed:', e); }

  return { score: 30, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/**
 * Nutrición: promedio de calidad por comida del día. food_logs NO tiene
 * quality_score (fantasma MB-6): la calidad vive en ai_analysis.score (IA)
 * o en notes.quality_score (registro manual) — misma regla que
 * nutrition-score-service. `date` es tipo date → igualdad, no rango timestamp.
 */
async function calcNutrition(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('ai_analysis, notes')
      .eq('user_id', userId)
      .eq('date', today);
    if (error) logWarn('[health-score] nutrition query failed:', error.message);

    if (data && data.length > 0) {
      const scores = data
        .map((f: any) => {
          const ai = f.ai_analysis?.score;
          if (Number.isFinite(ai)) return Number(ai);
          try {
            const notes = typeof f.notes === 'string' ? JSON.parse(f.notes) : f.notes;
            return Number.isFinite(notes?.quality_score) ? Number(notes.quality_score) : null;
          } catch { return null; }
        })
        .filter((s: number | null): s is number => s != null);
      const plural = data.length > 1 ? 's' : '';
      if (scores.length > 0) {
        const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        return { score: Math.min(100, avg), source: 'Registros', detail: `${data.length} comida${plural} hoy` };
      }
      // Hay comidas pero ninguna trae calidad: neutral honesto, no promedio inventado.
      return { score: 50, source: 'Registros', detail: `${data.length} comida${plural} sin calificar` };
    }
  } catch (e) { logWarn('[health-score] nutrition failed:', e); }

  return { score: 50, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Estrés: basado en stress_level (1-10, invertido — menor es mejor) */
async function calcStress(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data, error } = await supabase
      .from('health_measurements')
      .select('stress_level')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();
    if (error) logWarn('[health-score] stress query failed:', error.message);

    if (data?.stress_level) {
      // stress_level 1-10: invertir para que bajo estrés = alto score
      const inverted = 11 - data.stress_level;
      const score = Math.round(inverted * 10);
      return { score, source: 'Manual', detail: `Nivel ${data.stress_level}/10` };
    }
  } catch (e) { logWarn('[health-score] stress failed:', e); }

  return { score: 60, source: 'Sin datos', detail: 'Sin registro hoy' };
}

/** Recuperación: basada en frecuencia cardíaca en reposo */
async function calcRecovery(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    // Buscar medición de hoy o la más reciente
    const { data, error } = await supabase
      .from('health_measurements')
      .select('resting_hr')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) logWarn('[health-score] recovery query failed:', error.message);

    if (data?.resting_hr) {
      const hr = data.resting_hr;
      const score = hr < 55 ? 90 : hr < 65 ? 75 : hr < 75 ? 55 : 35;
      return { score, source: 'Manual', detail: `${hr} bpm en reposo` };
    }
  } catch (e) { logWarn('[health-score] recovery failed:', e); }

  return { score: 60, source: 'Sin datos', detail: 'Sin registro' };
}

/**
 * Cumplimiento de protocolo: plan del día en daily_plans. Las columnas reales
 * son completed_actions/total_actions/compliance_pct (fantasma MB-6:
 * completed_tasks/total_tasks no existen → el componente devolvía siempre
 * "Sin plan activo" aunque el plan fuera al 100%).
 * Estados distinguibles: Protocolo (hay plan, aunque vaya en 0%) ·
 * Sin protocolo (no hay fila) · Sin datos (falló la query, y se loguea).
 */
async function calcCompliance(userId: string, today: string): Promise<HealthScoreComponent> {
  try {
    const { data, error } = await supabase
      .from('daily_plans')
      .select('completed_actions, total_actions, compliance_pct')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();

    if (error) {
      logWarn('[health-score] compliance query failed:', error.message);
      return { score: 0, source: 'Sin datos', detail: 'No se pudo leer el plan' };
    }
    if (data && (data.total_actions ?? 0) > 0) {
      const total = data.total_actions as number;
      const done = data.completed_actions ?? 0;
      const pct = data.compliance_pct ?? Math.round((done / total) * 100);
      return { score: pct, source: 'Protocolo', detail: `${done}/${total} acciones` };
    }
  } catch (e) { logWarn('[health-score] compliance failed:', e); }

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
