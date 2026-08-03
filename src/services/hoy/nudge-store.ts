/**
 * Recordatorio contextual del tap largo (MB-20 Pieza 1.4).
 *
 * Si el usuario repite tap → navega → regresa sin completar tres veces en una
 * sesión, se enseña el gesto: "Para palomear un hábito, mantén presionado."
 * Máximo una vez por semana. Contador local: no se envía a ningún lado.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tap_largo_nudge_v1';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Umbral de idas-y-vueltas sin completar en una sesión. */
export const NUDGE_THRESHOLD = 3;

export async function canShowNudge(now: number = Date.now()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return true;
    const lastShown = Number(raw);
    return !Number.isFinite(lastShown) || now - lastShown >= WEEK_MS;
  } catch {
    return false;
  }
}

export function markNudgeShown(now: number = Date.now()): void {
  AsyncStorage.setItem(KEY, String(now)).catch(() => {});
}
