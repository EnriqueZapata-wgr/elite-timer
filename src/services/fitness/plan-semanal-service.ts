/**
 * plan-semanal-service (MB-27 Pieza 2) — I/O de la autoasignación.
 *
 * Reusa scheduled_routines (mig 001 + ALTER 257): el usuario se agenda a sí
 * mismo (assigned_by = user_id) por enfoque del generador. Las filas de
 * rutina guardada (routine_id, del coach o propias) NO se tocan desde aquí:
 * guardar tu plan de enfoques jamás borra lo que otro asignó.
 *
 * ⚠️ Clase {error}: supabase-js no lanza en 4xx — toda lectura se revisa y
 * null = fallo (la UI degrada, no inventa un plan vacío).
 * ⚠️ Este módulo NO toca estados de hábito, prefs ni ledger: la asignación
 * no enciende strength ni acredita su electrón. El aviso de reposo vive en
 * la UI, con decisión explícita del usuario (reactivarHabitos solo ahí).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  asignacionDeHoy, planDeFilas, proximaAsignacion,
  type AsignacionRow, type PlanSemanal, type ProximaAsignacion,
} from './plan-semanal-core';

/** Todas las filas activas del usuario (enfoque Y rutina, para resolver hoy). */
export async function getAsignaciones(userId: string): Promise<AsignacionRow[] | null> {
  const { data, error } = await supabase
    .from('scheduled_routines')
    .select('id, schedule_type, day_of_week, specific_date, focus, routine_id, is_active, routines(name)')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) {
    logWarn('[plan-semanal] read failed', error);
    return null;
  }
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    schedule_type: r.schedule_type,
    day_of_week: r.day_of_week,
    specific_date: r.specific_date,
    focus: r.focus,
    routine_id: r.routine_id,
    routine_name: r.routines?.name ?? null,
    is_active: r.is_active,
  }));
}

export interface EstadoAsignacionHoy {
  hoy: AsignacionRow | null;
  proxima: ProximaAsignacion | null;
  plan: PlanSemanal;
  /** true si el usuario ya configuró al menos un día (plan existe). */
  tienePlan: boolean;
}

/** null = lectura fallida: Entrenar se comporta exactamente como hoy. */
export async function getAsignacionHoy(userId: string): Promise<EstadoAsignacionHoy | null> {
  const rows = await getAsignaciones(userId);
  if (rows === null) return null;
  const hoy = getLocalToday();
  const plan = planDeFilas(rows);
  return {
    hoy: asignacionDeHoy(rows, hoy),
    proxima: proximaAsignacion(rows, hoy),
    plan,
    tienePlan: rows.length > 0,
  };
}

/**
 * Guarda el plan semanal de enfoques. Reemplaza SOLO las filas weekly de
 * enfoque del propio usuario; las filas con routine_id (coach o propias)
 * quedan intactas.
 */
export async function savePlanSemanal(
  userId: string,
  plan: PlanSemanal,
): Promise<{ ok: boolean }> {
  const { error: delErr } = await supabase
    .from('scheduled_routines')
    .delete()
    .eq('user_id', userId)
    .eq('schedule_type', 'weekly_cycle')
    .not('focus', 'is', null);
  if (delErr) {
    logWarn('[plan-semanal] delete failed', delErr);
    return { ok: false };
  }

  const rows = Object.entries(plan)
    .filter(([, focus]) => focus != null)
    .map(([dow, focus]) => ({
      user_id: userId,
      assigned_by: userId,
      routine_id: null,
      schedule_type: 'weekly_cycle' as const,
      day_of_week: Number(dow),
      focus,
    }));
  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from('scheduled_routines').insert(rows);
  if (error) {
    logWarn('[plan-semanal] insert failed', error);
    return { ok: false };
  }
  return { ok: true };
}
