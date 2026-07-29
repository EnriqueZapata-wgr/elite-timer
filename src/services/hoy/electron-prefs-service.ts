/**
 * electron-prefs-service (MB-12 · E-3) — el writer que faltaba.
 *
 * Barrido MB-11: NADIE escribía `active_boolean_electrons` — solo lectura
 * (day-compiler) y el default de la migración 043. Todo usuario quedaba
 * clavado de por vida en los 6 booleanos por default, y el opt-in de N-Back
 * no tenía puerta. Espejo del patrón de visibility-service
 * (client_profiles.hoy_cards_visible), sobre user_day_preferences.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { DEFAULT_BOOLEANS } from './day-booleans';

/** Espejo del DEFAULT_QUANTS de day-compiler (steps/sleep no tienen fuente). */
export const DEFAULT_QUANT_KEYS = ['protein', 'water'];

export interface ElectronPrefs {
  booleans: string[];
  quants: string[];
}

/**
 * Lee las listas persistidas. null = FALLO de lectura (clase {error} — no
 * pintar defaults como si fueran la elección del usuario). Sin fila aún →
 * defaults reales.
 */
export async function getElectronPrefs(userId: string): Promise<ElectronPrefs | null> {
  const { data, error } = await supabase
    .from('user_day_preferences')
    .select('active_boolean_electrons, active_quantitative_electrons')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logWarn('[electron-prefs] read failed:', error.message);
    return null;
  }
  const b = (data as any)?.active_boolean_electrons;
  const q = (data as any)?.active_quantitative_electrons;
  return {
    booleans: Array.isArray(b) ? b.filter((k: unknown): k is string => typeof k === 'string') : [...DEFAULT_BOOLEANS],
    quants: Array.isArray(q) ? q.filter((k: unknown): k is string => typeof k === 'string') : [...DEFAULT_QUANT_KEYS],
  };
}

/** PURO: aplica un toggle conservando el orden canónico del catálogo (y las
 *  llaves persistidas fuera de catálogo, al final — no se pierden). */
export function applyElectronToggle(
  current: string[],
  key: string,
  active: boolean,
  canonical: string[],
): string[] {
  const next = new Set(current);
  if (active) next.add(key); else next.delete(key);
  const ordered = canonical.filter((k) => next.has(k));
  for (const k of next) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  return ordered;
}

/** Persiste ambas listas. Regla técnica #5: tras escribir electrones se emite
 *  'electrons_changed' para que el HOY recompile. */
export async function setElectronPrefs(
  userId: string,
  prefs: ElectronPrefs,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_day_preferences')
    .upsert({
      user_id: userId,
      active_boolean_electrons: prefs.booleans,
      active_quantitative_electrons: prefs.quants,
    }, { onConflict: 'user_id' });
  if (error) {
    logWarn('[electron-prefs] write failed:', error.message);
    return { ok: false, error: error.message };
  }
  DeviceEventEmitter.emit('electrons_changed');
  return { ok: true };
}
