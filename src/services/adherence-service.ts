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

export const ADHERENCE_THRESHOLD = 75;
const DEFAULT_STREAK_WINDOW_DAYS = 90;

export interface PlanRow {
  date: string;
  compliance_pct: number | null;
}

async function fetchPlans(userId: string, days: number): Promise<PlanRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from('daily_plans')
    .select('date, compliance_pct')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date');
  return (data ?? []) as PlanRow[];
}

/**
 * Cálculo puro de la racha actual con 1 día de gracia.
 * `plans` debe venir ordenado ASC por fecha (el más reciente al final).
 * Itera de más reciente a más antiguo: día OK suma; primer FALLO se perdona
 * (no suma, no rompe); segundo FALLO rompe.
 */
export function computeStreak(plans: PlanRow[]): number {
  if (plans.length === 0) return 0;
  let streak = 0;
  let graceUsed = false;
  for (let i = plans.length - 1; i >= 0; i--) {
    const ok = (plans[i].compliance_pct ?? 0) >= ADHERENCE_THRESHOLD;
    if (ok) {
      streak++;
    } else if (!graceUsed) {
      graceUsed = true;
    } else {
      break;
    }
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
