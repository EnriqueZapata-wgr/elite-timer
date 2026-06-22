/**
 * Cache del insight diario de ARGOS — invalidación (H7). Módulo aislado (solo supabase +
 * date-helpers) para ser testeable sin arrastrar el grafo pesado de argos-service.
 * argos-service lo re-exporta para mantener el import público estable.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';

/**
 * H7: invalida el insight diario cacheado del usuario. Marca la fila de HOY como vieja
 * (created_at → epoch) para que el próximo load la considere fuera de la ventana de 6h y
 * REGENERE. Se llama al emitirse `day_changed` (nutrición/ayuno/hidratación cambian el
 * contexto del día).
 *
 * LAZY por diseño: NO regenera aquí. `day_changed` se dispara en cada mutación de comida/
 * ayuno (varias veces al día); regenerar en cada una sería spam de llamadas LLM. La
 * regeneración ocurre en la próxima carga del insight en el Home, como dice el handoff
 * ("próxima request al insight forzará re-generación").
 *
 * Scoped por user_id (+ RLS) → NUNCA toca insights de otros usuarios. No borra la fila
 * (conserva el texto como fallback). No-op silencioso si falla.
 */
export async function invalidateDailyInsight(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase
      .from('argos_daily_insights')
      .update({ created_at: new Date(0).toISOString() })
      .eq('user_id', userId)
      .eq('date', getLocalToday());
  } catch (e) {
    console.warn('invalidateDailyInsight error:', e);
  }
}
