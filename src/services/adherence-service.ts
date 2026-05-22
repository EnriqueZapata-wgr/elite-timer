/**
 * Adherence Service — single source of truth para racha y compliance del protocolo.
 *
 * Fuente: daily_plans.compliance_pct (precalculado al cierre del día).
 * Threshold: 75% — un día se considera "OK" si compliance_pct >= 75.
 *
 * Racha CON 1 día de gracia: un día <75% aislado NO rompe la racha
 * (solo no suma); 2+ días consecutivos <75% sí la rompen.
 *
 * NOTA: este servicio NO cubre streak de ejercicio (coach-panel-service
 * usa exercise_logs con regla binaria + tolerancia 1.5d entre sesiones).
 * Ni tampoco nutrition-service.adherence_score (IA per-meal). Esos son
 * conceptos distintos.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

export const ADHERENCE_THRESHOLD = 75;
const DEFAULT_STREAK_WINDOW_DAYS = 90;

export interface PlanRow {
  date: string;
  compliance_pct: number | null;
}

async function fetchPlans(userId: string, days: number): Promise<PlanRow[]> {
  const cursor = parseLocalDate(getLocalToday());
  cursor.setDate(cursor.getDate() - days);
  const sinceStr = toLocalDateString(cursor);
  const { data } = await supabase
    .from('daily_plans')
    .select('date, compliance_pct')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date');
  return (data ?? []) as PlanRow[];
}

/**
 * Racha actual contando días de CALENDARIO (no solo días con row en daily_plans).
 * Un día sin plan o con compliance <75 cuenta como FALLO; el primero se perdona.
 *
 * Reglas:
 *  - Itera día por día desde HOY hacia atrás.
 *  - Día OK (compliance_pct >= 75) suma.
 *  - HOY en progreso: si hoy no cumple aún, NO suma, NO rompe, NO consume gracia.
 *  - Día no-OK (no es hoy): primer fallo perdona (graceUsed=true, no suma, no rompe);
 *    segundo fallo rompe.
 *  - Fin de historia: parar al pasar antes del plan más antiguo del usuario
 *    presente en `plans`. Llegar al borde NO es un fallo.
 *
 * `plans` puede venir en cualquier orden — se indexa por fecha internamente.
 * Si el rango real del usuario excede la ventana consultada, la racha se techa
 * al tamaño de la ventana (ej. 90d).
 */
export function computeStreak(plans: PlanRow[]): number {
  if (plans.length === 0) return 0;

  const byDate = new Map<string, number>();
  let earliestPlanDate = plans[0].date;
  for (const p of plans) {
    byDate.set(p.date, p.compliance_pct ?? 0);
    if (p.date < earliestPlanDate) earliestPlanDate = p.date;
  }

  const today = getLocalToday();
  const cursor = parseLocalDate(today);
  let streak = 0;
  let graceUsed = false;

  while (true) {
    const cursorStr = toLocalDateString(cursor);
    const compliance = byDate.get(cursorStr);
    const ok = compliance !== undefined && compliance >= ADHERENCE_THRESHOLD;
    const isToday = cursorStr === today;

    if (ok) {
      streak++;
    } else if (isToday) {
      // Hoy en progreso: no suma, no rompe, no consume gracia.
    } else if (!graceUsed) {
      graceUsed = true;
    } else {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
    if (toLocalDateString(cursor) < earliestPlanDate) break;
  }

  return streak;
}

/** Promedio de compliance_pct (entero, 0 si no hay datos). */
export function computeAvgCompliance(plans: PlanRow[]): number {
  if (plans.length === 0) return 0;
  return Math.round(plans.reduce((s, p) => s + (p.compliance_pct ?? 0), 0) / plans.length);
}

/**
 * Racha actual con 1 día de gracia. Carga `daily_plans` de los últimos
 * `windowDays` y delega a computeStreak.
 */
export async function getCurrentStreak(
  userId: string,
  windowDays: number = DEFAULT_STREAK_WINDOW_DAYS,
): Promise<number> {
  try {
    const plans = await fetchPlans(userId, windowDays);
    return computeStreak(plans);
  } catch {
    return 0;
  }
}

/**
 * Compliance promedio + conteo de días registrados en los últimos `days`.
 * Reemplaza el cálculo manual duplicado en atp-ai-service y protocol-builder.
 */
export async function getComplianceStats(
  userId: string,
  days: number,
): Promise<{ avgCompliance: number; daysCount: number }> {
  try {
    const plans = await fetchPlans(userId, days);
    return { avgCompliance: computeAvgCompliance(plans), daysCount: plans.length };
  } catch {
    return { avgCompliance: 0, daysCount: 0 };
  }
}
