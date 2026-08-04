/**
 * La burbuja contextual del gesto (MB-20 Pieza 1.4, invertida en MB-20.4).
 *
 * El patrón viejo (tap → navegar → regresar sin completar) murió con el
 * gesto: ahora el tap palomea. La confusión que se detecta es la del que
 * espera que el toque ABRA la función:
 *
 *   a) Despalomea una fila hecha y la vuelve a palomear en segundos — el
 *      toque accidental que tocó el ledger (RECHECK_ACCIDENTE_MS).
 *   b) Descarta la paloma inteligente sin elegir (backdrop / botón atrás).
 *      Contestar NO sí es elegir: solo el descarte cuenta.
 *
 * NUDGE_THRESHOLD señales en una sesión → se enseña una vez: "Un toque
 * palomea. Para abrir la función, mantén presionado." Máximo una vez por
 * semana. Contador local: no se envía a ningún lado.
 *
 * Llave nueva a propósito: la burbuja vieja enseñaba el gesto viejo — quien
 * ya la vio merece ver la nueva una vez.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gesto_nudge_v2';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Umbral de señales de confusión en una sesión. */
export const NUDGE_THRESHOLD = 3;

/** Ventana para leer un despalomeo + re-palomeo como toque accidental. */
export const RECHECK_ACCIDENTE_MS = 10_000;

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
