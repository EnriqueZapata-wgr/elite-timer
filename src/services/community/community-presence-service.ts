/**
 * Presencia de comunidad — I/O sobre community_presence (migración 181).
 * La lógica pura (placeholder vs conteo) vive en community-presence-core.ts.
 *
 * Lectura fail-soft: cualquier error de red devuelve 0 (→ placeholder honesto).
 */
import { supabase } from '@/src/lib/supabase';

export type PresencePillar = 'hoy' | 'nutrition' | 'mente' | 'fitness';

/** Conteo crudo de usuarios activos hoy en un pilar (0 si falla o no hay fila). */
export async function getPresence(pillar: PresencePillar): Promise<number> {
  const { data, error } = await supabase
    .from('community_presence')
    .select('active_count')
    .eq('pillar', pillar)
    .maybeSingle();
  if (error) {
    console.warn('[community-presence] getPresence:', error.message);
    return 0;
  }
  const n = (data as { active_count?: number } | null)?.active_count;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
}
