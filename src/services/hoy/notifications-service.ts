/**
 * notifications-service — badge de la campana del HOY (#hoy-redesign, Parte 6).
 * countUnreadNotifications cuenta señales del día sin atender. CADA fuente va en su propio
 * try/catch: si una tabla no existe aún (ej. agenda_event_logs es de AGENDA V2, sprint futuro)
 * su count cae a 0 sin romper las demás ni el HOY. Conservador por diseño.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';

/** Cuenta resiliente de una sola fuente (head:true count). 0 ante cualquier error. */
async function safeCount(build: () => any): Promise<number> {
  try {
    const { count, error } = await build();
    if (error) return 0;
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

/**
 * Total de notificaciones sin atender hoy:
 *  - insights diarios de ARGOS del día sin leer,
 *  - labs recién extraídos pendientes de derivar a lab_results,
 *  - (futuro) eventos de agenda vencidos sin completar — tabla aún no existe → 0.
 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const today = getLocalToday();

  const insights = await safeCount(() =>
    supabase.from('argos_daily_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today).eq('read', false),
  );

  const labs = await safeCount(() =>
    supabase.from('lab_uploads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'extracted'),
  );

  const agenda = await safeCount(() =>
    supabase.from('agenda_event_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', today).eq('status', 'pending'),
  );

  return insights + labs + agenda;
}
