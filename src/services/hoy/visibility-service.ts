/**
 * visibility-service — toggles ON/OFF de las cards del HOY (#hoy-redesign, Parte 5).
 * Persiste en `client_profiles.hoy_cards_visible` (JSONB array de cardKeys visibles, migración 096).
 * Default conservador: TODAS visibles (si la columna no existe aún / es null / falla la lectura),
 * para que el HOY nunca se vea vacío por un fallo de datos.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';
import { INTERVENTIONS_DRIVE_HOY } from '@/src/constants/flags';
import { deriveProtocolDrivenVisible } from '@/src/services/hoy/protocol-cards-core';

/** PURO: normaliza el valor crudo de la columna a un Set de cardKeys visibles. */
export function parseVisible(raw: unknown): Set<string> {
  // null / undefined / no-array → default (todas visibles): nunca dejar el HOY vacío por datos.
  if (!Array.isArray(raw)) return new Set(HOY_CARD_ORDER_DEFAULT);
  const keys = raw.filter((k): k is string => typeof k === 'string');
  return new Set(keys);
}

/**
 * PURO — ítem 1 triple-audit (override aprobado): la config manual es una CAPA
 * DE OVERRIDE que el motor respeta. Con protocolo activo, la visibilidad parte
 * del set derivado (baseline ∪ prescritas) y se le RESTAN los hides EXPLÍCITOS
 * del user (cards del catálogo HOY ausentes de su array persistido). Guiado,
 * no prisionero: puedes ocultar una card aunque el motor la prescriba.
 * - Sin config manual persistida (null/no-array) → el motor manda tal cual.
 * - Guard anti-vacío: si el override dejara 0 cards, gana el derivado.
 */
export function applyManualOverride(derived: Set<string>, manualRaw: unknown): Set<string> {
  if (!Array.isArray(manualRaw)) return derived;
  const manualVisible = new Set(manualRaw.filter((k): k is string => typeof k === 'string'));
  const out = new Set(
    [...derived].filter((k) => !HOY_CARD_ORDER_DEFAULT.includes(k) || manualVisible.has(k)),
  );
  return out.size > 0 ? out : derived;
}

/** PURO: aplica un toggle a un array de visibles y devuelve el nuevo array (en orden canónico). */
export function applyToggle(current: Set<string>, cardKey: string, visible: boolean): string[] {
  const next = new Set(current);
  if (visible) next.add(cardKey); else next.delete(cardKey);
  // Mantener el orden canónico (no el de inserción) para estabilidad.
  return HOY_CARD_ORDER_DEFAULT.filter((k) => next.has(k));
}

/** Lee el valor CRUDO de la config manual (undefined si falla — fail-soft). */
async function readManualRaw(userId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('hoy_cards_visible')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { logWarn('[hoy-visibility] readManualRaw failed:', error); return undefined; }
  return (data as any)?.hoy_cards_visible;
}

/** Lee el set de cards visibles del usuario. Default (todas) si falla / no hay fila. */
export async function getCardsVisible(userId: string): Promise<Set<string>> {
  try {
    return parseVisible(await readManualRaw(userId));
  } catch (err) {
    logWarn('[hoy-visibility] getCardsVisible threw:', err);
    return new Set(HOY_CARD_ORDER_DEFAULT);
  }
}

/**
 * Visibilidad EFECTIVA de las cards del HOY (#3b): con `INTERVENTIONS_DRIVE_HOY`
 * ON, las cards responden a Mi Protocolo (baseline universal ∪ prescritas) en vez
 * de a la config manual. Fail-soft en cascada: protocolo vacío / error → config
 * manual (getCardsVisible) → default todas, para nunca dejar el HOY vacío.
 */
export async function getEffectiveCardsVisible(userId: string): Promise<Set<string>> {
  if (!INTERVENTIONS_DRIVE_HOY) return getCardsVisible(userId);
  try {
    const { getMyProtocol } = await import('@/src/services/interventions/intervention-service');
    const protocol = await getMyProtocol(userId);
    const derived = deriveProtocolDrivenVisible(protocol.map((p) => p.def?.name ?? ''));
    if (derived) {
      // Ítem 1 triple-audit: los toggles de "Configura HOY" vuelven a significar
      // algo — el set del motor respeta los hides manuales del user.
      let manualRaw: unknown;
      try { manualRaw = await readManualRaw(userId); } catch { manualRaw = undefined; }
      return applyManualOverride(derived, manualRaw);
    }
  } catch (err) {
    logWarn('[hoy-visibility] getEffectiveCardsVisible fallback a manual:', err);
  }
  return getCardsVisible(userId);
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
