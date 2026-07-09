/**
 * Modo nutrición — I/O (#52, Sprint NUTRICIÓN T2).
 *
 * Persiste en client_profiles.nutrition_mode (migración 166) y sincroniza
 * el precursor macro_mode para que las UIs existentes (useMacroMode) sigan
 * coherentes sin refactor masivo. Cambios se propagan por DeviceEventEmitter.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { MACRO_MODE_EVENT } from '@/src/hooks/useMacroMode';
import { resolveNutritionMode, macroModeFor, type NutritionMode } from './nutrition-mode-core';

export const NUTRITION_MODE_EVENT = 'nutrition_mode_changed';

export async function getNutritionMode(userId: string): Promise<NutritionMode> {
  try {
    const { data } = await supabase
      .from('client_profiles')
      .select('nutrition_mode, macro_mode')
      .eq('user_id', userId)
      .maybeSingle();
    return resolveNutritionMode(data as any);
  } catch (e) {
    logWarn('[nutrition-mode] get failed, default simple:', e);
    return 'simple';
  }
}

export async function setNutritionMode(userId: string, mode: NutritionMode): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('client_profiles')
      .update({ nutrition_mode: mode, macro_mode: macroModeFor(mode) })
      .eq('user_id', userId);
    if (error) {
      logWarn('[nutrition-mode] set failed:', error.message);
      return false;
    }
    DeviceEventEmitter.emit(NUTRITION_MODE_EVENT);
    DeviceEventEmitter.emit(MACRO_MODE_EVENT); // useMacroMode recarga
    return true;
  } catch (e) {
    logWarn('[nutrition-mode] set threw:', e);
    return false;
  }
}
