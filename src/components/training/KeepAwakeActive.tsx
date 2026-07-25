/**
 * KeepAwakeActive (MB-3 Track E) — mantiene la pantalla despierta mientras
 * está montado. Montarlo condicionalmente = keep-awake condicional sin
 * romper las reglas de hooks. Igual que el runner (execution.tsx).
 */
import { useKeepAwake } from 'expo-keep-awake';

export function KeepAwakeActive(): null {
  useKeepAwake();
  return null;
}
