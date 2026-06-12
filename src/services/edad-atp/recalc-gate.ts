/**
 * Gating de recálculo de Edad ATP (#15 ahorro de coins/cómputo, #16 badge de datos nuevos).
 * Guarda el hash del set de datos del ÚLTIMO cálculo. Si el hash actual coincide → no hay
 * por qué recalcular. Si difiere → hay datos nuevos integrados.
 *
 * `recalcStatus` es PURO (testeable). La persistencia usa AsyncStorage (clave por usuario).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';

const KEY_PREFIX = 'edad_atp_last_calc_';

export type LastCalc = { hash: string; at: string; integral?: number };

export type RecalcStatus = {
  /** El set de datos cambió desde el último cálculo (o nunca se calculó). */
  hasNewData: boolean;
  /** No hay cambios → recalcular gastaría sin necesidad. */
  unchanged: boolean;
  /** Fecha (ISO) del último cálculo, si lo hubo. */
  lastAt?: string;
};

/** Núcleo PURO: compara el hash actual con el del último cálculo. */
export function recalcStatus(currentHash: string, last: LastCalc | null): RecalcStatus {
  if (!last) return { hasNewData: true, unchanged: false };
  const unchanged = last.hash === currentHash;
  return { hasNewData: !unchanged, unchanged, lastAt: last.at };
}

export async function getLastCalc(userId: string): Promise<LastCalc | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as LastCalc) : null;
  } catch (err) {
    logWarn('[recalc-gate] getLastCalc failed:', err);
    return null;
  }
}

export async function saveLastCalc(userId: string, value: LastCalc): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify(value));
  } catch (err) {
    logWarn('[recalc-gate] saveLastCalc failed:', err);
  }
}
