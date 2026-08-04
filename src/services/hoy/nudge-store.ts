/**
 * La burbuja contextual del gesto (MB-20 Pieza 1.4, invertida en MB-20.4).
 *
 * El patrón viejo (tap → navegar → regresar sin completar) murió con el
 * gesto: en las palomeables el tap palomea. La señal de confusión que
 * queda (MB-20.5, con el modal muerto) es la del toque accidental:
 * despalomear una fila hecha y re-palomearla en segundos — tocó el ledger
 * (RECHECK_ACCIDENTE_MS).
 *
 * NUDGE_THRESHOLD señales en una sesión → se enseña la regla una vez (el
 * copy vive en tarea-gesto-core NUDGE_COPY, junto a la tabla que
 * describe, con test). Máximo una vez por semana. Contador local: no se
 * envía a ningún lado.
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
