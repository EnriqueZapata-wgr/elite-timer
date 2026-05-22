/**
 * Daily Review Service — Cierre del día por reglas (no ARGOS).
 *
 * Toma el CompiledDay actual + datos comparativos de los últimos 7 días
 * y produce: 1-2 highlights, 1 red flag (si aplica), 1 foco para mañana.
 * Sin LLM — todo determinístico para que el cierre del día sea siempre
 * instantáneo y predecible.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import type { CompiledDay } from './day-compiler';

export interface DailyReview {
  // Resumen
  scorePct: number;             // % del día (electronProgress.percentage)
  electronsEarned: number;      // earned
  electronsPossible: number;    // possible
  boolCompleted: number;        // electrones booleanos completados
  boolTotal: number;            // total booleanos del día
  streak: number;               // racha actual (caller la pasa)

  // Mensajes
  highlights: string[];         // 1-2 elementos positivos
  redFlag: string | null;       // 1 señal a mejorar (o null)
  focus: string;                // 1 línea accionable para mañana
}

/**
 * Construye el Daily Review. El caller pasa el CompiledDay (ya cargado en HOY)
 * y la racha. La función solo carga los datos comparativos extra que necesita.
 */
export async function buildDailyReview(
  userId: string,
  day: CompiledDay,
  streak: number,
): Promise<DailyReview> {
  const today = getLocalToday();
  const sevenAgoCursor = parseLocalDate(today);
  sevenAgoCursor.setDate(sevenAgoCursor.getDate() - 6);
  const sevenAgo = toLocalDateString(sevenAgoCursor);

  const scorePct = day.electronProgress.percentage;
  const electronsEarned = day.electronProgress.earned;
  const electronsPossible = day.electronProgress.possible;
  const boolCompleted = day.booleanElectrons.filter(e => e.completed).length;
  const boolTotal = day.booleanElectrons.length;

  // Comparativos en paralelo
  const [proteinByDay, glucoseToday, mealsToday] = await Promise.all([
    fetchProteinByDay(userId, sevenAgo, today),
    fetchGlucoseToday(userId, today),
    fetchMealsToday(userId, today),
  ]);

  const highlights: string[] = [];

  // Highlight: 100% booleanos completados
  if (boolTotal > 0 && boolCompleted === boolTotal) {
    highlights.push(`Completaste el 100% de tus electrones booleanos (${boolCompleted}/${boolTotal}).`);
  }

  // Highlight: racha de ≥ 3 días
  if (streak >= 3) {
    highlights.push(`Llevas ${streak} días seguidos — racha viva.`);
  }

  // Highlight: mejor día de proteína de la semana
  const proteinToday = proteinByDay[today] ?? 0;
  if (proteinToday > 0) {
    const otherDays = Object.entries(proteinByDay).filter(([d]) => d !== today);
    const maxOther = otherDays.reduce((m, [, v]) => Math.max(m, v), 0);
    if (proteinToday > maxOther && otherDays.length >= 2) {
      highlights.push(`Tu mejor día de proteína de la semana: ${Math.round(proteinToday)}g.`);
    }
  }

  // Highlight: score ≥ 80% sin haberlo activado antes (proxy: hoy > promedio 7d)
  // (lo dejamos como heurística simple: si score ≥ 80% entra como highlight)
  if (highlights.length < 2 && scorePct >= 80) {
    highlights.push(`Cerraste el día en ${scorePct}% — buen ritmo.`);
  }

  // Cap a 2
  const cappedHighlights = highlights.slice(0, 2);

  // Red flag — prioridad: 0 electrones > glucosa alta > sin comidas
  let redFlag: string | null = null;
  if (boolCompleted === 0 && boolTotal > 0) {
    redFlag = `Hoy no completaste ningún electrón booleano. Mañana, una sola acción reinicia el ritmo.`;
  } else if (glucoseToday.maxValue !== null && glucoseToday.maxValue > 140) {
    redFlag = `Glucosa elevada hoy (máx ${glucoseToday.maxValue} mg/dL). Considera una caminata post-comida y revisa la siguiente ingesta.`;
  } else if (mealsToday === 0) {
    redFlag = `No registraste ninguna comida hoy. El tracking nutricional es la base de tus insights.`;
  }

  // Foco para mañana — accionable, 1 línea
  const focus = buildFocus({ scorePct, boolCompleted, boolTotal, streak, proteinToday, redFlag });

  return {
    scorePct,
    electronsEarned,
    electronsPossible,
    boolCompleted,
    boolTotal,
    streak,
    highlights: cappedHighlights,
    redFlag,
    focus,
  };
}

function buildFocus(args: {
  scorePct: number;
  boolCompleted: number;
  boolTotal: number;
  streak: number;
  proteinToday: number;
  redFlag: string | null;
}): string {
  // Si hay red flag, el foco lo refleja
  if (args.redFlag) {
    if (args.boolCompleted === 0) return 'Mañana: 1 electrón temprano (luz solar al despertar).';
    if (args.proteinToday === 0) return 'Mañana: registra al menos 1 comida con proteína.';
    return 'Mañana: 1 acción chica para reactivar el ritmo.';
  }
  if (args.scorePct >= 80 && args.streak >= 3) {
    return 'Mañana: mantén el ritmo — la consistencia compone.';
  }
  if (args.boolCompleted < args.boolTotal) {
    return 'Mañana: enfócate en cerrar los electrones que quedaron pendientes hoy.';
  }
  return 'Mañana: agrega 1 electrón nuevo y observa cómo te sientes.';
}

// ═══ HELPERS DE DATOS ═══

async function fetchProteinByDay(userId: string, startStr: string, endStr: string): Promise<Record<string, number>> {
  try {
    const { data } = await supabase
      .from('food_logs')
      .select('date, protein_g')
      .eq('user_id', userId)
      .gte('date', startStr)
      .lte('date', endStr);
    const byDay: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      byDay[r.date] = (byDay[r.date] ?? 0) + (Number(r.protein_g) || 0);
    });
    return byDay;
  } catch { return {}; }
}

async function fetchGlucoseToday(userId: string, today: string): Promise<{ maxValue: number | null }> {
  try {
    const { data } = await supabase
      .from('glucose_logs')
      .select('value_mg_dl')
      .eq('user_id', userId)
      .eq('date', today);
    if (!data || data.length === 0) return { maxValue: null };
    const max = Math.max(...data.map((r: any) => Number(r.value_mg_dl) || 0));
    return { maxValue: max };
  } catch { return { maxValue: null }; }
}

async function fetchMealsToday(userId: string, today: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', today);
    return count ?? 0;
  } catch { return 0; }
}
