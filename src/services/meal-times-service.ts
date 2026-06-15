/**
 * Meal Times Service — ventanas horarias de comidas configurables por el usuario
 * (Mariana #14: la pantalla "¿Qué comida registras?" mostraba horarios fijos que
 * ignoraban la configuración del usuario).
 *
 * Persistencia DEVICE-LOCAL (AsyncStorage), a propósito: no existe columna/tabla de
 * horarios por-comida y el sprint NO permite migraciones SQL sin aprobar (flag #2).
 * Si se quiere sync entre dispositivos, hace falta una columna en client_profiles
 * (ej. meal_times JSONB) — pendiente de aprobación de Enrique (ver COWORK_REPORT).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEAL_IDS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const;
export type MealId = typeof MEAL_IDS[number];

/** Horarios por defecto (los que estaban hardcoded en food-register). */
export const DEFAULT_MEAL_TIMES: Record<MealId, string> = {
  breakfast: '7:00 – 9:00',
  snack_am: '10:00 – 11:00',
  lunch: '13:00 – 15:00',
  snack_pm: '16:00 – 17:00',
  dinner: '19:00 – 21:00',
};

const storageKey = (userId?: string) => `meal_times:${userId ?? 'anon'}`;

/** Horarios efectivos: overrides del usuario sobre los defaults. */
export async function getMealTimes(userId?: string): Promise<Record<MealId, string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const override = raw ? (JSON.parse(raw) as Partial<Record<MealId, string>>) : {};
    return { ...DEFAULT_MEAL_TIMES, ...override };
  } catch {
    return { ...DEFAULT_MEAL_TIMES };
  }
}

/** Guarda los horarios configurados por el usuario (device-local). */
export async function setMealTimes(userId: string | undefined, times: Record<MealId, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(times));
  } catch { /* best-effort */ }
}
