/**
 * MB-32 — puente al módulo nativo AtpWidgets (solo Android).
 *
 * Doctrina ExpoPrint (nativos nuevos SIEMPRE lazy): requireNativeModule
 * revienta AL IMPORTAR en binarios sin el módulo (OTA viejo, Expo Go, iOS,
 * web) → el require va lazy y memoizado, y todo degrada fail-soft a null.
 * Quien consume revisa null y no hace nada: los widgets simplemente no
 * existen donde el módulo no existe.
 */
import { Platform } from 'react-native';

export interface NativeAtpWidgets {
  setSnapshot(kind: string, json: string): boolean;
  getSnapshot(kind: string): string | null;
  getPendingActions(): string;
  markActionsHandled(ids: string[]): boolean;
  clearAll(): boolean;
  refreshWidgets(): boolean;
}

let cached: NativeAtpWidgets | null | undefined;

export function getWidgetsNative(): NativeAtpWidgets | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  try {
    const { requireNativeModule } = require('expo-modules-core');
    cached = requireNativeModule('AtpWidgets') as NativeAtpWidgets;
  } catch {
    cached = null;
  }
  return cached;
}

/** Solo para tests: resetea el memo del require. */
export function __resetWidgetsNativeForTests(): void {
  cached = undefined;
}
