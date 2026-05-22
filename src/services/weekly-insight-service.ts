/**
 * Weekly Insight Service — Lectura semanal cacheada.
 *
 * Una llamada a ARGOS por (user_id, week_start). El resultado se guarda en
 * `weekly_insights` (migración 067). Si la fila ya existe para la semana
 * actual, se devuelve cacheada sin llamar al LLM.
 *
 * El contexto incluye: adherencia semanal por pilar (computada por reglas
 * sobre electron_logs/food_logs/etc.) y deltas vs semana anterior. ARGOS
 * solo agrega el texto reflexivo + pregunta abierta — los números siempre
 * vienen del cliente, así que la UI puede degradarse con gracia si la
 * llamada al LLM falla.
 */
import { supabase } from '@/src/lib/supabase';
import { callAnthropic } from './anthropic-client';
import { getArgosCallMetadata } from './argos-service';
import { ATP_LLM } from '@/src/constants/llm-config';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { getComplianceStats } from './adherence-service';

// ═══ TIPOS ═══

export interface PillarAdherence {
  key: 'fitness' | 'nutrition' | 'mind' | 'supplements' | 'hydration';
  label: string;
  pct: number;          // 0..100 esta semana
  prevPct: number;      // 0..100 semana previa (mismo cómputo)
  delta: number;        // pct - prevPct
}

export interface WeeklyInsightData {
  weekStart: string;            // YYYY-MM-DD lunes ISO
  weekEnd: string;              // YYYY-MM-DD domingo ISO
  adherence: PillarAdherence[];
  compliance: { avgPct: number; daysCount: number; prevAvgPct: number };
  argosText: string;            // texto reflexivo (vacío si la llamada falló)
  question: string;             // pregunta abierta (vacío si la llamada falló)
  generatedAt: string;          // ISO timestamp
  argosFailed: boolean;         // true si ARGOS no respondió — UI degrada
}

// ═══ HELPERS DE FECHA ═══

/**
 * Lunes ISO de la semana en la que cae `date`. Por convención usamos
 * lunes=inicio (compatible con `getLocalDayOfWeek` 1..7).
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0=domingo, 1=lunes, ..., 6=sábado. Lo queremos 0=lunes.
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ═══ MÉTRICAS POR PILAR (REGLAS) ═══

/**
 * Carga días con al menos 1 electrón booleano de fitness en el rango
 * [start, end]. Si el usuario hace 5/7 días → 71%.
 */
async function pillarFitnessPct(userId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('electron_logs')
      .select('date')
      .eq('user_id', userId)
      .in('source', ['strength', 'breathwork'])
      .gte('date', startStr)
      .lte('date', endStr);
    const unique = new Set((data ?? []).map((r: any) => r.date));
    return Math.round((unique.size / 7) * 100);
  } catch { return 0; }
}

/** Días con ≥2 comidas registradas (food_logs.protein_g) / 7. */
async function pillarNutritionPct(userId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('food_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { counts[r.date] = (counts[r.date] ?? 0) + 1; });
    const okDays = Object.values(counts).filter(c => c >= 2).length;
    return Math.round((okDays / 7) * 100);
  } catch { return 0; }
}

/** Días con meditación/breathwork registrados (mind_sessions o electron_logs). */
async function pillarMindPct(userId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('mind_sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr);
    const unique = new Set((data ?? []).map((r: any) => r.date));
    return Math.round((unique.size / 7) * 100);
  } catch { return 0; }
}

/** Días con al menos 1 supplement_log.taken / 7. */
async function pillarSupplementsPct(userId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('supplement_logs')
      .select('date, taken')
      .eq('user_id', userId)
      .eq('taken', true)
      .gte('date', startStr)
      .lte('date', endStr);
    const unique = new Set((data ?? []).map((r: any) => r.date));
    return Math.round((unique.size / 7) * 100);
  } catch { return 0; }
}

/** Hidratación: % promedio de total_ml/goal por día con registro. */
async function pillarHydrationPct(userId: string, startStr: string, endStr: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('hydration_logs')
      .select('date, total_ml, goal_ml')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr);
    if (!data || data.length === 0) return 0;
    // Sumamos % por día (capped 100) y dividimos entre 7 — días sin registro = 0%.
    let totalPct = 0;
    for (const r of data as any[]) {
      const goal = Number(r.goal_ml) || 2000;
      const ml = Number(r.total_ml) || 0;
      totalPct += Math.min(100, Math.round((ml / goal) * 100));
    }
    return Math.round(totalPct / 7);
  } catch { return 0; }
}

/**
 * Promedio de compliance_pct sobre daily_plans en un rango cerrado.
 * Devuelve 0 si no hay rows en ese rango. Espejo de `computeAvgCompliance`
 * pero por rango (no por "últimos N días"), para comparar la semana
 * previa con exactitud.
 */
async function computePrevWeekCompliance(
  userId: string,
  startStr: string,
  endStr: string,
): Promise<{ avgCompliance: number; daysCount: number }> {
  try {
    const { data } = await supabase
      .from('daily_plans')
      .select('compliance_pct')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr);
    const rows = (data ?? []) as { compliance_pct: number | null }[];
    if (rows.length === 0) return { avgCompliance: 0, daysCount: 0 };
    const avg = rows.reduce((s, r) => s + (r.compliance_pct ?? 0), 0) / rows.length;
    return { avgCompliance: Math.round(avg), daysCount: rows.length };
  } catch {
    return { avgCompliance: 0, daysCount: 0 };
  }
}

/**
 * Computa adherencia por pilar para un rango [start, end] (ambos YYYY-MM-DD).
 * 5 pilares en paralelo.
 */
async function computePillars(userId: string, startStr: string, endStr: string) {
  const [fitness, nutrition, mind, supplements, hydration] = await Promise.all([
    pillarFitnessPct(userId, startStr, endStr),
    pillarNutritionPct(userId, startStr, endStr),
    pillarMindPct(userId, startStr, endStr),
    pillarSupplementsPct(userId, startStr, endStr),
    pillarHydrationPct(userId, startStr, endStr),
  ]);
  return { fitness, nutrition, mind, supplements, hydration };
}

// ═══ PROMPT A ARGOS ═══

function buildPrompt(data: {
  pillars: Record<string, number>;
  prev: Record<string, number>;
  compliance: { avgPct: number; daysCount: number; prevAvgPct: number };
}): string {
  const lines: string[] = [];
  lines.push('## ADHERENCIA SEMANAL POR PILAR');
  lines.push(`- Fitness: ${data.pillars.fitness}% (semana previa ${data.prev.fitness}%)`);
  lines.push(`- Nutrición: ${data.pillars.nutrition}% (previa ${data.prev.nutrition}%)`);
  lines.push(`- Mente: ${data.pillars.mind}% (previa ${data.prev.mind}%)`);
  lines.push(`- Suplementos: ${data.pillars.supplements}% (previa ${data.prev.supplements}%)`);
  lines.push(`- Hidratación: ${data.pillars.hydration}% (previa ${data.prev.hydration}%)`);
  lines.push('');
  lines.push('## CUMPLIMIENTO GLOBAL');
  lines.push(`- Compliance promedio: ${data.compliance.avgPct}% en ${data.compliance.daysCount} días`);
  lines.push(`- Semana previa: ${data.compliance.prevAvgPct}%`);
  return lines.join('\n');
}

const WEEKLY_INSIGHT_SYSTEM = `Eres ARGOS, IA de salud funcional de ATP. Vas a leer la semana del usuario y darle UNA reflexión integrativa (3-4 oraciones máximo) + UNA pregunta abierta para invitarlo a la consciencia. Reglas:
- Conecta 2+ pilares si los datos lo permiten (no des consejos aislados).
- Empoderador, no alarmista. Si bajó algo, sugiere causa funcional (sueño, estrés, ciclo, viaje), no culpa.
- Si todo está bajo (<40%), sé compasivo y sugiere UNA palanca chica.
- Si hay mejora vs semana previa, celébrala explícitamente.
- Sin emojis. Sin saludo. Directo.
- Termina con una pregunta abierta que invite a reflexión (no a acción inmediata).

FORMATO DE RESPUESTA (JSON estricto, sin markdown, sin backticks):
{
  "insight": "tu reflexión 3-4 oraciones",
  "question": "tu pregunta abierta de 1 oración"
}`;

// ═══ API PÚBLICA ═══

/**
 * Obtiene el insight semanal del usuario para la semana actual.
 * - Si ya hay caché en `weekly_insights` para la `week_start` de esta semana → cacheado.
 * - Si no → genera (1 llamada LLM), guarda y devuelve.
 *
 * Si ARGOS falla, devuelve el objeto con números válidos y `argosFailed: true`
 * para que la UI degrade con gracia (sin texto reflexivo).
 */
export async function getWeeklyInsight(userId: string): Promise<WeeklyInsightData | null> {
  try {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = addDays(weekStart, 6);
    const weekStartStr = toLocalDateString(weekStart);
    const weekEndStr = toLocalDateString(weekEnd);

    // 1) Caché
    const { data: cached } = await supabase
      .from('weekly_insights')
      .select('insight_data, generated_at')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle();
    if (cached?.insight_data) {
      return cached.insight_data as WeeklyInsightData;
    }

    // 2) Compute rule-based metrics (semana actual + previa en paralelo)
    const prevStart = addDays(weekStart, -7);
    const prevEnd = addDays(weekStart, -1);
    const prevStartStr = toLocalDateString(prevStart);
    const prevEndStr = toLocalDateString(prevEnd);

    const [current, previous, complianceCur, compliancePrev] = await Promise.all([
      computePillars(userId, weekStartStr, weekEndStr),
      computePillars(userId, prevStartStr, prevEndStr),
      getComplianceStats(userId, 7),
      computePrevWeekCompliance(userId, prevStartStr, prevEndStr),
    ]);

    const adherence: PillarAdherence[] = [
      { key: 'fitness',     label: 'Fitness',     pct: current.fitness,     prevPct: previous.fitness,     delta: current.fitness - previous.fitness },
      { key: 'nutrition',   label: 'Nutrición',   pct: current.nutrition,   prevPct: previous.nutrition,   delta: current.nutrition - previous.nutrition },
      { key: 'mind',        label: 'Mente',       pct: current.mind,        prevPct: previous.mind,        delta: current.mind - previous.mind },
      { key: 'supplements', label: 'Suplementos', pct: current.supplements, prevPct: previous.supplements, delta: current.supplements - previous.supplements },
      { key: 'hydration',   label: 'Hidratación', pct: current.hydration,   prevPct: previous.hydration,   delta: current.hydration - previous.hydration },
    ];

    const compliance = {
      avgPct: complianceCur.avgCompliance,
      daysCount: complianceCur.daysCount,
      prevAvgPct: compliancePrev.avgCompliance,
    };

    // 3) Llamar a ARGOS (con manejo de error → degradación grácil)
    let argosText = '';
    let question = '';
    let argosFailed = false;
    try {
      const prompt = buildPrompt({ pillars: current, prev: previous, compliance });
      const meta = await getArgosCallMetadata({ requestType: 'weekly_insight', callerUserId: userId });
      const data = await callAnthropic(
        [{ role: 'user', content: prompt }],
        400,
        ATP_LLM.PRIMARY_MODEL,
        WEEKLY_INSIGHT_SYSTEM,
        meta,
      );
      const text = data?.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      argosText = String(parsed?.insight || '').trim();
      question = String(parsed?.question || '').trim();
      if (!argosText) argosFailed = true;
    } catch (e) {
      console.warn('Weekly insight ARGOS error:', e);
      argosFailed = true;
    }

    const insight: WeeklyInsightData = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      adherence,
      compliance,
      argosText,
      question,
      generatedAt: new Date().toISOString(),
      argosFailed,
    };

    // 4) Cachear (solo si ARGOS respondió — para reintentar en la siguiente apertura si falló)
    if (!argosFailed) {
      try {
        await supabase.from('weekly_insights').upsert(
          { user_id: userId, week_start: weekStartStr, insight_data: insight },
          { onConflict: 'user_id,week_start' },
        );
      } catch (e) {
        console.warn('Weekly insight cache write error:', e);
      }
    }

    return insight;
  } catch (e) {
    console.warn('getWeeklyInsight error:', e);
    return null;
  }
}

/** True si HOY es domingo (día de semana 0) y `hour >= 19`. */
export function isWeeklyInsightTime(now: Date = new Date()): boolean {
  return now.getDay() === 0 && now.getHours() >= 19;
}
