/**
 * Servicio de wearables — Integración con Apple HealthKit y Google Health Connect.
 *
 * IMPORTANTE: Los paquetes nativos (@kingstinct/react-native-healthkit,
 * react-native-health-connect) NO están instalados todavía.
 * Todas las funciones retornan null/false hasta que se instalen
 * y se haga un build nativo con EAS Build.
 *
 * Cuando los paquetes se instalen, descomentar los bloques marcados con
 * [NATIVE] y el código funcionará automáticamente.
 *
 * iOS:  @kingstinct/react-native-healthkit
 * Android: react-native-health-connect
 */
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

// ============================================================
// Interfaces
// ============================================================

export interface WearableData {
  source: string;                   // 'apple_health' | 'google_health' | 'manual'
  lastSync: string;                 // ISO timestamp
  sleep?: {
    totalHours: number;
    deepHours: number;
    remHours: number;
    lightHours: number;
    efficiency: number;             // 0-100
    bedTime: string;
    wakeTime: string;
  };
  steps?: number;
  activeMinutes?: number;
  restingHR?: number;
  hrv?: number;                     // SDNN en ms
  spo2?: number;                    // porcentaje 0-100
  recovery?: number;                // score derivado 0-100
  calories?: {
    total: number;
    active: number;
    basal: number;
  };
}

// ============================================================
// Helpers internos
// ============================================================

/** Calcula un score de recuperación basado en HRV + resting HR */
function calculateRecovery(hrv?: number, restingHR?: number): number | undefined {
  if (hrv == null && restingHR == null) return undefined;
  let score = 50;
  if (hrv != null) {
    score = Math.min(100, Math.max(0, (hrv / 80) * 100));
  }
  if (restingHR != null) {
    const hrPenalty = Math.max(0, (restingHR - 50) * 0.5);
    score = Math.max(0, score - hrPenalty);
  }
  return Math.round(score);
}

/**
 * Flag interno: ¿están los módulos nativos disponibles?
 * Se pone en true automáticamente cuando se instalan los paquetes
 * y se hace build nativo. Por ahora es false (OTA-safe).
 */
const NATIVE_MODULES_INSTALLED = false;

// ============================================================
// 1. Verificar disponibilidad
// ============================================================

export async function isWearableAvailable(): Promise<boolean> {
  if (!NATIVE_MODULES_INSTALLED) return false;

  // [NATIVE] Cuando los paquetes estén instalados, descomentar:
  // try {
  //   if (Platform.OS === 'ios') {
  //     const HK = require('@kingstinct/react-native-healthkit');
  //     return !!HK;
  //   }
  //   if (Platform.OS === 'android') {
  //     const HC = require('react-native-health-connect');
  //     return !!HC;
  //   }
  // } catch { return false; }

  return false;
}

// ============================================================
// 2. Solicitar permisos
// ============================================================

export async function requestWearablePermissions(): Promise<boolean> {
  if (!NATIVE_MODULES_INSTALLED) return false;

  // [NATIVE] iOS: Apple HealthKit
  // if (Platform.OS === 'ios') {
  //   try {
  //     const HK = require('@kingstinct/react-native-healthkit');
  //     const { HKQuantityTypeIdentifier, HKCategoryTypeIdentifier } = HK;
  //     await HK.requestAuthorization([
  //       HKQuantityTypeIdentifier.stepCount,
  //       HKQuantityTypeIdentifier.heartRate,
  //       HKQuantityTypeIdentifier.restingHeartRate,
  //       HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
  //       HKQuantityTypeIdentifier.oxygenSaturation,
  //       HKQuantityTypeIdentifier.activeEnergyBurned,
  //       HKQuantityTypeIdentifier.basalEnergyBurned,
  //       HKQuantityTypeIdentifier.appleExerciseTime,
  //       HKCategoryTypeIdentifier.sleepAnalysis,
  //     ], []);
  //     return true;
  //   } catch (e) {
  //     console.warn('[Wearable] Error permisos HealthKit:', e);
  //     return false;
  //   }
  // }

  // [NATIVE] Android: Google Health Connect
  // if (Platform.OS === 'android') {
  //   try {
  //     const HC = require('react-native-health-connect');
  //     await HC.initialize();
  //     await HC.requestPermission([
  //       { accessType: 'read', recordType: 'Steps' },
  //       { accessType: 'read', recordType: 'HeartRate' },
  //       { accessType: 'read', recordType: 'RestingHeartRate' },
  //       { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  //       { accessType: 'read', recordType: 'OxygenSaturation' },
  //       { accessType: 'read', recordType: 'SleepSession' },
  //       { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  //       { accessType: 'read', recordType: 'ExerciseSession' },
  //     ]);
  //     return true;
  //   } catch (e) {
  //     console.warn('[Wearable] Error permisos Health Connect:', e);
  //     return false;
  //   }
  // }

  return false;
}

// ============================================================
// 3. Leer datos del día (cross-platform)
// ============================================================

/**
 * Lee todos los datos de salud del wearable para una fecha dada.
 * Retorna null si no hay módulo nativo instalado.
 *
 * Cuando NATIVE_MODULES_INSTALLED sea true, esta función delegará
 * a getHealthKitData() o getHealthConnectData() según la plataforma.
 */
export async function getWearableDataForDate(date: string): Promise<WearableData | null> {
  if (!NATIVE_MODULES_INSTALLED) return null;

  // [NATIVE] Descomentar cuando los paquetes estén instalados:
  // try {
  //   if (Platform.OS === 'ios') return await getHealthKitData(date);
  //   if (Platform.OS === 'android') return await getHealthConnectData(date);
  // } catch (e) {
  //   console.warn('[Wearable] Error obteniendo datos:', e);
  // }

  return null;
}

// ============================================================
// 4. Persistir en Supabase
// ============================================================

/**
 * Guarda (upsert) los datos del wearable en health_measurements.
 * Funciona independientemente de los módulos nativos — se puede
 * llamar con datos de cualquier fuente.
 */
export async function saveWearableToSupabase(
  userId: string,
  data: WearableData,
): Promise<boolean> {
  try {
    const date = data.lastSync.split('T')[0];

    const payload: Record<string, any> = {
      user_id: userId,
      date,
      updated_at: new Date().toISOString(),
    };

    if (data.restingHR != null) payload.resting_hr = data.restingHR;
    if (data.sleep?.totalHours != null) payload.sleep_hours = data.sleep.totalHours;
    if (data.steps != null) payload.steps_daily = data.steps;
    if (data.activeMinutes != null) payload.exercise_min_weekly = data.activeMinutes;

    // Campos extendidos en JSON
    const wearableJson: Record<string, any> = {
      source: data.source,
      lastSync: data.lastSync,
    };
    if (data.hrv != null) wearableJson.hrv = data.hrv;
    if (data.spo2 != null) wearableJson.spo2 = data.spo2;
    if (data.recovery != null) wearableJson.recovery = data.recovery;
    if (data.sleep) wearableJson.sleep = data.sleep;
    if (data.calories) wearableJson.calories = data.calories;
    if (data.activeMinutes != null) wearableJson.activeMinutes = data.activeMinutes;

    payload.wearable_data = wearableJson;

    const { error } = await supabase
      .from('health_measurements')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      console.warn('[Wearable] Error guardando en Supabase:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[Wearable] Error en saveWearableToSupabase:', error);
    return false;
  }
}

// ============================================================
// 5. Helpers de estado de conexión
// ============================================================

/** Retorna el nombre de la fuente conectada según la plataforma */
export function getConnectedSource(): string {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Google Health';
  return 'Desconocido';
}

/** Placeholder para desconectar — los permisos se revocan desde Ajustes del OS */
export async function disconnectWearable(): Promise<void> {
  console.log('[Wearable] Desconexión solicitada por el usuario');
}

// ============================================================
// 6. Sincronización completa (conveniencia)
// ============================================================

/**
 * Flujo completo: verificar → permisos → leer datos → guardar en Supabase.
 * Pensado para un botón "Sincronizar Wearable" en la UI.
 */
export async function syncWearableData(userId: string, date?: string): Promise<WearableData | null> {
  try {
    const available = await isWearableAvailable();
    if (!available) return null;

    const hasPermission = await requestWearablePermissions();
    if (!hasPermission) return null;

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const data = await getWearableDataForDate(targetDate);
    if (!data) return null;

    await saveWearableToSupabase(userId, data);
    return data;
  } catch (error) {
    console.warn('[Wearable] Error en syncWearableData:', error);
    return null;
  }
}

// ============================================================
// [NATIVE] Código de lectura de Apple HealthKit (iOS)
// ============================================================
//
// Descomentar cuando se instale @kingstinct/react-native-healthkit
// y se haga build nativo:
//
// async function getHealthKitData(date: string): Promise<WearableData | null> {
//   const HK = require('@kingstinct/react-native-healthkit');
//   const { HKQuantityTypeIdentifier, HKCategoryTypeIdentifier,
//           queryQuantitySamples, queryCategorySamples, queryStatisticsForQuantity } = HK;
//   const dayStart = new Date(date + 'T00:00:00');
//   const dayEnd = new Date(date + 'T23:59:59.999');
//   const result: WearableData = { source: 'apple_health', lastSync: new Date().toISOString() };
//
//   // Pasos
//   const stepsResult = await queryStatisticsForQuantity(HKQuantityTypeIdentifier.stepCount,
//     { from: dayStart.toISOString(), to: dayEnd.toISOString() });
//   if (stepsResult?.sumQuantity?.doubleValue) result.steps = Math.round(stepsResult.sumQuantity.doubleValue);
//
//   // Resting HR
//   const rhrSamples = await queryQuantitySamples(HKQuantityTypeIdentifier.restingHeartRate,
//     { from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1 });
//   if (rhrSamples?.length > 0) result.restingHR = Math.round(rhrSamples[0].quantity);
//
//   // HRV
//   const hrvSamples = await queryQuantitySamples(HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
//     { from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1 });
//   if (hrvSamples?.length > 0) result.hrv = Math.round(hrvSamples[0].quantity * 10) / 10;
//
//   // SpO2
//   const spo2Samples = await queryQuantitySamples(HKQuantityTypeIdentifier.oxygenSaturation,
//     { from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1 });
//   if (spo2Samples?.length > 0) result.spo2 = Math.round(spo2Samples[0].quantity * 100);
//
//   // Sleep (12h lookback)
//   const sleepStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);
//   const sleepSamples = await queryCategorySamples(HKCategoryTypeIdentifier.sleepAnalysis,
//     { from: sleepStart.toISOString(), to: dayEnd.toISOString() });
//   // ... procesar etapas de sueño ...
//
//   result.recovery = calculateRecovery(result.hrv, result.restingHR);
//   return result;
// }

// ============================================================
// [NATIVE] Código de lectura de Google Health Connect (Android)
// ============================================================
//
// Descomentar cuando se instale react-native-health-connect
// y se haga build nativo:
//
// async function getHealthConnectData(date: string): Promise<WearableData | null> {
//   const HC = require('react-native-health-connect');
//   await HC.initialize();
//   const dayStart = new Date(date + 'T00:00:00').toISOString();
//   const dayEnd = new Date(date + 'T23:59:59.999').toISOString();
//   const timeRangeFilter = { operator: 'between', startTime: dayStart, endTime: dayEnd };
//   const result: WearableData = { source: 'google_health', lastSync: new Date().toISOString() };
//
//   // Pasos
//   const steps = await HC.readRecords('Steps', { timeRangeFilter });
//   result.steps = steps.records?.reduce((s: number, r: any) => s + (r.count || 0), 0);
//
//   // Resting HR
//   const rhr = await HC.readRecords('RestingHeartRate', { timeRangeFilter });
//   if (rhr.records?.length > 0) result.restingHR = Math.round(rhr.records.at(-1).beatsPerMinute);
//
//   // HRV
//   const hrv = await HC.readRecords('HeartRateVariabilityRmssd', { timeRangeFilter });
//   if (hrv.records?.length > 0) result.hrv = Math.round(hrv.records.at(-1).heartRateVariabilityMillis);
//
//   // Sleep (12h lookback)
//   const sleepStart = new Date(new Date(date + 'T00:00:00').getTime() - 12*3600000).toISOString();
//   const sleep = await HC.readRecords('SleepSession', {
//     timeRangeFilter: { operator: 'between', startTime: sleepStart, endTime: dayEnd }
//   });
//   // ... procesar etapas de sueño ...
//
//   result.recovery = calculateRecovery(result.hrv, result.restingHR);
//   return result;
// }
