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
  asignacionDeHoy, planDeFilas, proximaAsignacion, rutinasPorDia,
  type AsignacionRow, type PlanSemanal, type ProximaAsignacion,
} from './plan-semanal-core';

/** Todas las filas activas del usuario (enfoque Y rutina, para resolver hoy).
 *  Audit B7: ORDER BY created_at — la entrada llega determinista; la
 *  precedencia real (rutina > enfoque, más nuevo entre enfoques) la aplica
 *  el core en cada resolución. */
export async function getAsignaciones(userId: string): Promise<AsignacionRow[] | null> {
  const { data, error } = await supabase
    .from('scheduled_routines')
    .select('id, schedule_type, day_of_week, specific_date, focus, routine_id, is_active, created_at, routines(name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
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
    created_at: r.created_at ?? null,
  }));
}

export interface EstadoAsignacionHoy {
  hoy: AsignacionRow | null;
  proxima: ProximaAsignacion | null;
  plan: PlanSemanal;
  /** Rutinas concretas agendadas por día (coach o propias) — audit B7:
   *  la pantalla del plan las dice en vez de pintar "Descanso". */
  rutinasDia: Partial<Record<number, string>>;
  /** true si el usuario configuró SU plan de enfoques (audit B7: las filas
   *  del coach o una fecha vencida no hacen "Cambiar mi plan"). */
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
    rutinasDia: rutinasPorDia(rows),
    tienePlan: Object.keys(plan).length > 0,
  };
}

/**
 * Guarda el plan semanal de enfoques. Reemplaza SOLO las filas weekly de
 * enfoque del propio usuario; las filas con routine_id (coach o propias)
 * quedan intactas.
 *
 * Audit B4 — el dato del usuario es sagrado (regla 6): el orden es INSERT
 * primero (una sentencia, atómica) y poda de las filas viejas DESPUÉS. Si
 * el insert falla (red, o la migración 257 sin aplicar), el plan anterior
 * queda intacto y "intenta de nuevo" es verdad. Si fallara la poda, quedan
 * filas duplicadas un rato: nada se pierde, el orden determinista del core
 * hace ganar el guardado más nuevo y el siguiente guardado las poda.
 */
export async function savePlanSemanal(
  userId: string,
  plan: PlanSemanal,
): Promise<{ ok: boolean }> {
  // 1 · Las filas viejas del plan propio, POR id — la poda de abajo no
  //     puede tocar lo que este guardado no conoció (ni al coach jamás).
  const { data: viejas, error: readErr } = await supabase
    .from('scheduled_routines')
    .select('id')
    .eq('user_id', userId)
    .eq('schedule_type', 'weekly_cycle')
    .not('focus', 'is', null);
  if (readErr) {
    logWarn('[plan-semanal] read for save failed', readErr);
    return { ok: false };
  }

  // 2 · INSERT del plan nuevo, primero y atómico.
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
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('scheduled_routines').insert(rows);
    if (insErr) {
      // El plan viejo sigue completo: reintentarlo es seguro.
      logWarn('[plan-semanal] insert failed (plan viejo intacto)', insErr);
      return { ok: false };
    }
  }

  // 3 · Poda de las filas viejas, solo con el plan nuevo ya adentro.
  const idsViejas = (viejas ?? []).map((r: { id: string }) => r.id);
  if (idsViejas.length > 0) {
    const { error: delErr } = await supabase
      .from('scheduled_routines')
      .delete()
      .eq('user_id', userId)
      .in('id', idsViejas);
    if (delErr) {
      // Duplicado temporal, jamás pérdida: el core ordena el más nuevo
      // primero y el próximo guardado limpia.
      logWarn('[plan-semanal] prune failed (duplicado temporal, nada perdido)', delErr);
    }
  }
  return { ok: true };
}
