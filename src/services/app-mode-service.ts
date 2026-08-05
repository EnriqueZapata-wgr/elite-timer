/**
 * Modo por app instalada (MB-22 Pieza 4) — I/O sobre user_app_modes (mig 249).
 *
 * Hoy solo lo usa Ciclo ('propio' | 'acompanante'), pero la tabla es genérica
 * por app_key. Fail-soft integral: si la tabla aún no existe en el remoto
 * (db push pendiente) o la lectura falla, se devuelve null y TODO se comporta
 * como hoy (gate por biological_sex). Un fallo de red jamás abre el ciclo a
 * quien no le toca ni mete datos de acompañante a salud.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { parseCycleMode, type CycleMode } from '@/src/services/cycle/cycle-access-core';

export async function getCycleAppMode(userId: string): Promise<CycleMode | null> {
  try {
    const { data, error } = await supabase
      .from('user_app_modes')
      .select('mode')
      .eq('user_id', userId)
      .eq('app_key', 'ciclo')
      .maybeSingle();
    if (error) return null; // tabla ausente (42P01) o RLS: comportamiento de hoy
    return parseCycleMode((data as any)?.mode);
  } catch {
    return null;
  }
}

export async function setCycleAppMode(
  userId: string,
  mode: CycleMode,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from('user_app_modes')
    .upsert(
      { user_id: userId, app_key: 'ciclo', mode, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,app_key' },
    );
  if (error) {
    logWarn('[app-mode] set cycle mode failed', error);
    return { ok: false };
  }
  return { ok: true };
}
