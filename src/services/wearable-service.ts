/**
 * Servicio de wearables — DESACTIVADO TEMPORALMENTE.
 *
 * Los paquetes nativos (react-native-health-connect, @kingstinct/react-native-healthkit)
 * fueron removidos porque requieren compileSdkVersion 34+ y configuración extra de Gradle.
 *
 * TODO: Reactivar cuando configuremos builds nativos con Health Connect SDK.
 */
import { Platform } from 'react-native';

// ============================================================
// Interfaces
// ============================================================

export interface WearableData {
  source: string;
  lastSync: string;
  sleep?: {
    totalHours: number;
    deepHours: number;
    remHours: number;
    lightHours: number;
    efficiency: number;
    bedTime: string;
    wakeTime: string;
  };
  steps?: number;
  activeMinutes?: number;
  restingHR?: number;
  hrv?: number;
  spo2?: number;
  recovery?: number;
  calories?: {
    total: number;
    active: number;
    basal: number;
  };
}

// ============================================================
// 1. Verificar disponibilidad — DESACTIVADO
// ============================================================

export async function isWearableAvailable(): Promise<boolean> {
  // TODO: activar cuando configuremos build nativo con Health Connect SDK
  return false;
}

// ============================================================
// 2. Solicitar permisos — DESACTIVADO
// ============================================================

export async function requestWearablePermissions(): Promise<boolean> {
  // TODO: activar cuando configuremos build nativo con Health Connect SDK
  return false;
}

// ============================================================
// 3. Leer datos del día — DESACTIVADO
// ============================================================

export async function getWearableDataForDate(date: string): Promise<WearableData | null> {
  // TODO: activar cuando configuremos build nativo con Health Connect SDK
  return null;
}

// ============================================================
// 4. Persistir en Supabase (sin cambios, no usa módulos nativos)
// ============================================================

export async function saveWearableToSupabase(userId: string, data: WearableData): Promise<boolean> {
  // TODO: reactivar cuando el servicio de wearables esté operativo
  console.warn('[Wearable] Servicio desactivado temporalmente');
  return false;
}

// ============================================================
// 5. Helpers
// ============================================================

export function getConnectedSource(): string {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Google Health';
  return 'Desconocido';
}

export async function disconnectWearable(): Promise<void> {
  console.log('[Wearable] Desconexión solicitada');
}

export async function syncWearableData(userId: string, date?: string): Promise<WearableData | null> {
  // TODO: activar cuando configuremos build nativo con Health Connect SDK
  return null;
}
