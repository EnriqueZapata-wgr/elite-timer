/**
 * Cache del insight diario de ARGOS — invalidación (H7). Módulo aislado (solo supabase +
 * date-helpers) para ser testeable sin arrastrar el grafo pesado de argos-service.
 * argos-service lo re-exporta para mantener el import público estable.
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { INSIGHT_EN_VENTANA } from '@/src/constants/flags';

/**
 * Evento DeviceEventEmitter: el insight diario cambió en el cache (se generó o
 * regeneró uno nuevo). Lo emite quien escribe argos_daily_insights (HOY tras el
 * upsert); lo escucha quien lo pinta (OrbCard) para no depender del orden de
 * montaje frente a la generación. Solo la constante vive aquí: este módulo se
 * testea en node y no puede importar react-native.
 */
export const ARGOS_INSIGHT_CHANGED_EVENT = 'argos_insight_changed';

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
    // CIERRE-4: con la ventana activa se marca `stale` y NO se toca created_at.
    // Falsear la marca de tiempo era doblemente malo: le mentía a cualquier
    // lector del historial y anulaba la única guarda de frecuencia que existía,
    // que es de donde salían las llamadas de más a Sonnet.
    const patch = INSIGHT_EN_VENTANA
      ? { stale: true }
      : { created_at: new Date(0).toISOString() };
    const { error } = await supabase
      .from('argos_daily_insights')
      .update(patch)
      .eq('user_id', userId)
      .eq('date', getLocalToday());
    // La columna `stale` llega en la migración 275. Si el OTA se publica antes
    // del db push, PostgREST responde "column does not exist": se cae al método
    // viejo para no dejar el insight congelado hasta el día siguiente.
    if (error && INSIGHT_EN_VENTANA) {
      await supabase
        .from('argos_daily_insights')
        .update({ created_at: new Date(0).toISOString() })
        .eq('user_id', userId)
        .eq('date', getLocalToday());
    }
  } catch (e) {
    console.warn('invalidateDailyInsight error:', e);
  }
}

/** Lo que HOY necesita saber del insight cacheado para decidir si regenera. */
export interface InsightCacheHoy {
  insight: string | null;
  createdAtMs: number | null;
  stale: boolean;
}

/**
 * Lee el insight de hoy. Aislado aquí (y no en la pantalla) porque tiene una
 * sutileza: la columna `stale` puede no existir todavía si el OTA salió antes
 * del `db push` de la 275. En ese caso se reintenta sin la columna y se asume
 * `stale: true` — o sea, se conserva la conducta generosa de regenerar al
 * cruzar de ventana. Fallar hacia el lado de darle su insight al usuario.
 */
export async function leerInsightDeHoy(userId: string): Promise<InsightCacheHoy | null> {
  const hoy = getLocalToday();
  const base = () => supabase.from('argos_daily_insights').select('insight, created_at, stale')
    .eq('user_id', userId).eq('date', hoy).maybeSingle();

  let row: { insight?: string | null; created_at?: string | null; stale?: boolean | null } | null = null;
  let sinColumnaStale = false;

  const { data, error } = await base();
  if (error) {
    sinColumnaStale = true;
    const legacy = await supabase.from('argos_daily_insights').select('insight, created_at')
      .eq('user_id', userId).eq('date', hoy).maybeSingle();
    if (legacy.error) throw legacy.error;
    row = legacy.data;
  } else {
    row = data;
  }

  if (!row) return null;
  const ms = row.created_at ? new Date(row.created_at).getTime() : null;
  return {
    insight: row.insight ?? null,
    createdAtMs: ms !== null && Number.isFinite(ms) ? ms : null,
    stale: sinColumnaStale ? true : row.stale === true,
  };
}
