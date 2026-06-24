/**
 * visibility-service — toggles ON/OFF de las cards del HOY (#hoy-redesign, Parte 5).
 * Persiste en `client_profiles.hoy_cards_visible` (JSONB array de cardKeys visibles, migración 096).
 * Default conservador: TODAS visibles (si la columna no existe aún / es null / falla la lectura),
 * para que el HOY nunca se vea vacío por un fallo de datos.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';

/** PURO: normaliza el valor crudo de la columna a un Set de cardKeys visibles. */
export function parseVisible(raw: unknown): Set<string> {
  // null / undefined / no-array → default (todas visibles): nunca dejar el HOY vacío por datos.
  if (!Array.isArray(raw)) return new Set(HOY_CARD_ORDER_DEFAULT);
  const keys = raw.filter((k): k is string => typeof k === 'string');
  return new Set(keys);
}

/** PURO: aplica un toggle a un array de visibles y devuelve el nuevo array (en orden canónico). */
export function applyToggle(current: Set<string>, cardKey: string, visible: boolean): string[] {
  const next = new Set(current);
  if (visible) next.add(cardKey); else next.delete(cardKey);
  // Mantener el orden canónico (no el de inserción) para estabilidad.
  return HOY_CARD_ORDER_DEFAULT.filter((k) => next.has(k));
}

/** Lee el set de cards visibles del usuario. Default (todas) si falla / no hay fila. */
export async function getCardsVisible(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('hoy_cards_visible')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { logWarn('[hoy-visibility] getCardsVisible failed:', error); return new Set(HOY_CARD_ORDER_DEFAULT); }
    return parseVisible((data as any)?.hoy_cards_visible);
  } catch (err) {
    logWarn('[hoy-visibility] getCardsVisible threw:', err);
    return new Set(HOY_CARD_ORDER_DEFAULT);
  }
}

/** Prende/apaga una card y persiste el array completo. */
export async function setCardVisible(userId: string, cardKey: string, visible: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const current = await getCardsVisible(userId);
    const next = applyToggle(current, cardKey, visible);
    const { error } = await supabase
      .from('client_profiles')
      .update({ hoy_cards_visible: next })
      .eq('user_id', userId);
    if (error) { logWarn('[hoy-visibility] setCardVisible failed:', error); return { ok: false, error: error.message }; }
    return { ok: true };
  } catch (err: any) {
    logWarn('[hoy-visibility] setCardVisible threw:', err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}
