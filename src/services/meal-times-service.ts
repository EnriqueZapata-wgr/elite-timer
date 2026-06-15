/**
 * Meal Times Service — capa con I/O: SYNC entre dispositivos (DB) + timezone real.
 * Decisión de Enrique sobre el flag #2 del Sprint 2+3 (antes era device-local).
 *
 * Fuente de verdad: `client_profiles.meal_times` (JSONB) + `client_profiles.timezone` (IANA),
 * agregadas por la migración 073 (Enrique la corre manual). Si la columna no existe o el
 * usuario está offline, cae a DEFAULT_MEAL_TIMES sin romper.
 *
 * La lógica pura (tipos, defaults, getCurrentMeal, format…) vive en `meal-times-core.ts`
 * (testeable sin imports nativos) y se reexporta aquí para no romper imports existentes.
 */
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import {
  MEAL_IDS, DEFAULT_MEAL_TIMES, normalizeMealTimes, parseLegacyWindow,
  type MealTimes,
} from '@/src/services/meal-times-core';

export {
  MEAL_IDS, MEAL_LABELS, DEFAULT_MEAL_TIMES, formatMealWindow, normalizeMealTimes, getCurrentMeal,
} from '@/src/services/meal-times-core';
export type { MealId, MealWindow, MealTimes } from '@/src/services/meal-times-core';

const legacyKey = (userId?: string) => `meal_times:${userId ?? 'anon'}`;

/** Timezone IANA del dispositivo (fallback CDMX). */
export function deviceTimezone(): string {
  try {
    return Localization.getCalendars()[0]?.timeZone ?? 'America/Mexico_City';
  } catch {
    return 'America/Mexico_City';
  }
}

/** Sube los horarios legacy device-local a DB (una vez) y borra el AsyncStorage. */
async function migrateLegacyLocal(userId: string): Promise<MealTimes | null> {
  try {
    const raw = await AsyncStorage.getItem(legacyKey(userId));
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Record<string, string>;
    const out: MealTimes = { ...DEFAULT_MEAL_TIMES };
    for (const id of MEAL_IDS) {
      const w = legacy[id] ? parseLegacyWindow(legacy[id]) : null;
      if (w) out[id] = w;
    }
    await setMealTimes(userId, out);
    await AsyncStorage.removeItem(legacyKey(userId));
    return out;
  } catch {
    return null;
  }
}

/** Lee horarios + timezone del usuario (DB). Migra legacy local si hace falta. */
export async function getMealTimes(userId: string): Promise<{ mealTimes: MealTimes; timezone: string }> {
  let mealTimes: MealTimes = DEFAULT_MEAL_TIMES;
  let timezone = deviceTimezone();
  try {
    const { data } = await supabase
      .from('client_profiles')
      .select('meal_times, timezone')
      .eq('user_id', userId)
      .single();
    if (data?.meal_times) {
      mealTimes = normalizeMealTimes(data.meal_times);
    } else {
      const migrated = await migrateLegacyLocal(userId);
      if (migrated) mealTimes = migrated;
    }
    if (data?.timezone) timezone = data.timezone;
  } catch {
    /* offline / columna aún no migrada → defaults */
  }
  return { mealTimes, timezone };
}

/** Guarda horarios + timezone. Sync inmediato a DB (sirve en todos los dispositivos). */
export async function setMealTimes(userId: string, mealTimes: MealTimes, timezone?: string): Promise<void> {
  const tz = timezone ?? deviceTimezone();
  await supabase
    .from('client_profiles')
    .upsert({ user_id: userId, meal_times: mealTimes, timezone: tz }, { onConflict: 'user_id' });
}
