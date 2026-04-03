/**
 * Servicio de wearables — Integración con Apple HealthKit y Google Health Connect.
 *
 * Los paquetes nativos están instalados:
 * - iOS: @kingstinct/react-native-healthkit
 * - Android: react-native-health-connect
 *
 * REQUIERE build nativo (eas build). NO funciona en Expo Go.
 * En OTA updates sobre un build que ya tiene los módulos, sí funciona.
 */
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

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
// Helpers internos
// ============================================================

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

// ============================================================
// 1. Verificar disponibilidad
// ============================================================

export async function isWearableAvailable(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const HK = require('@kingstinct/react-native-healthkit');
      return !!HK;
    }
    if (Platform.OS === 'android') {
      const HC = require('react-native-health-connect');
      return !!HC;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// 2. Solicitar permisos
// ============================================================

export async function requestWearablePermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      const HK = require('@kingstinct/react-native-healthkit');
      const { HKQuantityTypeIdentifier, HKCategoryTypeIdentifier } = HK;
      await HK.requestAuthorization([
        HKQuantityTypeIdentifier.stepCount,
        HKQuantityTypeIdentifier.heartRate,
        HKQuantityTypeIdentifier.restingHeartRate,
        HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
        HKQuantityTypeIdentifier.oxygenSaturation,
        HKQuantityTypeIdentifier.activeEnergyBurned,
        HKQuantityTypeIdentifier.basalEnergyBurned,
        HKQuantityTypeIdentifier.appleExerciseTime,
        HKCategoryTypeIdentifier.sleepAnalysis,
      ], []);
      return true;
    } catch (e) {
      console.warn('[Wearable] Error permisos HealthKit:', e);
      return false;
    }
  }

  if (Platform.OS === 'android') {
    try {
      const HC = require('react-native-health-connect');
      const isInit = await HC.initialize();
      if (!isInit) return false;
      const granted = await HC.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]);
      return Array.isArray(granted) && granted.length > 0;
    } catch (e) {
      console.warn('[Wearable] Error permisos Health Connect:', e);
      return false;
    }
  }

  return false;
}

// ============================================================
// 3. Leer datos — Apple HealthKit (iOS)
// ============================================================

async function getHealthKitData(date: string): Promise<WearableData | null> {
  try {
    const HK = require('@kingstinct/react-native-healthkit');
    const {
      HKQuantityTypeIdentifier,
      HKCategoryTypeIdentifier,
      queryQuantitySamples,
      queryCategorySamples,
      queryStatisticsForQuantity,
    } = HK;

    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59.999');
    const sleepSearchStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);

    const result: WearableData = {
      source: 'Apple Health',
      lastSync: new Date().toISOString(),
    };

    // Pasos
    try {
      const sr = await queryStatisticsForQuantity(HKQuantityTypeIdentifier.stepCount, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(),
      });
      if (sr?.sumQuantity?.doubleValue != null) result.steps = Math.round(sr.sumQuantity.doubleValue);
    } catch {}

    // FC en reposo
    try {
      const rhr = await queryQuantitySamples(HKQuantityTypeIdentifier.restingHeartRate, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1,
      });
      if (rhr?.length > 0) result.restingHR = Math.round(rhr[0].quantity);
    } catch {}

    // HRV (SDNN)
    try {
      const hrv = await queryQuantitySamples(HKQuantityTypeIdentifier.heartRateVariabilitySDNN, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1,
      });
      if (hrv?.length > 0) result.hrv = Math.round(hrv[0].quantity * 10) / 10;
    } catch {}

    // SpO2
    try {
      const spo2 = await queryQuantitySamples(HKQuantityTypeIdentifier.oxygenSaturation, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(), ascending: false, limit: 1,
      });
      if (spo2?.length > 0) result.spo2 = Math.round(spo2[0].quantity * 100);
    } catch {}

    // Calorías activas
    let activeCals = 0;
    try {
      const ac = await queryStatisticsForQuantity(HKQuantityTypeIdentifier.activeEnergyBurned, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(),
      });
      if (ac?.sumQuantity?.doubleValue != null) activeCals = Math.round(ac.sumQuantity.doubleValue);
    } catch {}

    // Calorías basales
    let basalCals = 0;
    try {
      const bc = await queryStatisticsForQuantity(HKQuantityTypeIdentifier.basalEnergyBurned, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(),
      });
      if (bc?.sumQuantity?.doubleValue != null) basalCals = Math.round(bc.sumQuantity.doubleValue);
    } catch {}

    if (activeCals > 0 || basalCals > 0) {
      result.calories = { active: activeCals, basal: basalCals, total: activeCals + basalCals };
    }

    // Minutos de ejercicio
    try {
      const ex = await queryStatisticsForQuantity(HKQuantityTypeIdentifier.appleExerciseTime, {
        from: dayStart.toISOString(), to: dayEnd.toISOString(),
      });
      if (ex?.sumQuantity?.doubleValue != null) result.activeMinutes = Math.round(ex.sumQuantity.doubleValue);
    } catch {}

    // Sueño (12h lookback)
    try {
      const sleepSamples = await queryCategorySamples(HKCategoryTypeIdentifier.sleepAnalysis, {
        from: sleepSearchStart.toISOString(), to: dayEnd.toISOString(), ascending: true,
      });

      if (sleepSamples?.length > 0) {
        let deepMin = 0, remMin = 0, coreMin = 0, totalMin = 0;
        let bedTime: string | null = null, wakeTime: string | null = null;

        for (const s of sleepSamples) {
          const dur = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (!bedTime || new Date(s.startDate) < new Date(bedTime)) bedTime = s.startDate;
          if (!wakeTime || new Date(s.endDate) > new Date(wakeTime)) wakeTime = s.endDate;

          switch (s.value) {
            case 4: deepMin += dur; totalMin += dur; break;    // AsleepDeep
            case 5: remMin += dur; totalMin += dur; break;     // AsleepREM
            case 3: case 1: coreMin += dur; totalMin += dur; break; // AsleepCore / Unspecified
          }
        }

        if (totalMin > 0 && bedTime && wakeTime) {
          const inBed = (new Date(wakeTime).getTime() - new Date(bedTime).getTime()) / 60000;
          result.sleep = {
            totalHours: Math.round((totalMin / 60) * 100) / 100,
            deepHours: Math.round((deepMin / 60) * 100) / 100,
            remHours: Math.round((remMin / 60) * 100) / 100,
            lightHours: Math.round((coreMin / 60) * 100) / 100,
            efficiency: inBed > 0 ? Math.round((totalMin / inBed) * 100) : 0,
            bedTime,
            wakeTime,
          };
        }
      }
    } catch {}

    result.recovery = calculateRecovery(result.hrv, result.restingHR);
    return result;
  } catch (error) {
    console.warn('[Wearable] HealthKit error:', error);
    return null;
  }
}

// ============================================================
// 4. Leer datos — Google Health Connect (Android)
// ============================================================

async function getHealthConnectData(date: string): Promise<WearableData | null> {
  try {
    const HC = require('react-native-health-connect');
    const isInit = await HC.initialize();
    if (!isInit) return null;

    const dayStart = new Date(date + 'T00:00:00').toISOString();
    const dayEnd = new Date(date + 'T23:59:59.999').toISOString();
    const sleepStart = new Date(new Date(date + 'T00:00:00').getTime() - 12 * 3600000).toISOString();
    const tf = { operator: 'between' as const, startTime: dayStart, endTime: dayEnd };

    const result: WearableData = {
      source: 'Google Health',
      lastSync: new Date().toISOString(),
    };

    // Pasos
    try {
      const s = await HC.readRecords('Steps', { timeRangeFilter: tf });
      if (s?.records?.length > 0) result.steps = s.records.reduce((a: number, r: any) => a + (r.count || 0), 0);
    } catch {}

    // FC en reposo
    try {
      const r = await HC.readRecords('RestingHeartRate', { timeRangeFilter: tf });
      if (r?.records?.length > 0) {
        const last = r.records[r.records.length - 1];
        result.restingHR = Math.round(last.samples?.[0]?.beatsPerMinute ?? last.beatsPerMinute ?? 0);
      }
    } catch {}

    // HRV
    try {
      const h = await HC.readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: tf });
      if (h?.records?.length > 0) {
        const last = h.records[h.records.length - 1];
        if (last.heartRateVariabilityMillis != null) result.hrv = Math.round(last.heartRateVariabilityMillis * 10) / 10;
      }
    } catch {}

    // SpO2
    try {
      const o = await HC.readRecords('OxygenSaturation', { timeRangeFilter: tf });
      if (o?.records?.length > 0) result.spo2 = Math.round(o.records[o.records.length - 1].percentage ?? 0);
    } catch {}

    // Calorías activas
    let activeCals = 0;
    try {
      const c = await HC.readRecords('ActiveCaloriesBurned', { timeRangeFilter: tf });
      if (c?.records?.length > 0) activeCals = Math.round(c.records.reduce((a: number, r: any) => a + (r.energy?.inKilocalories || 0), 0));
    } catch {}

    if (activeCals > 0) result.calories = { active: activeCals, basal: 0, total: activeCals };

    // Minutos de ejercicio
    try {
      const e = await HC.readRecords('ExerciseSession', { timeRangeFilter: tf });
      if (e?.records?.length > 0) {
        let mins = 0;
        for (const session of e.records) {
          mins += (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000;
        }
        result.activeMinutes = Math.round(mins);
      }
    } catch {}

    // Sueño
    try {
      const sl = await HC.readRecords('SleepSession', {
        timeRangeFilter: { operator: 'between' as const, startTime: sleepStart, endTime: dayEnd },
      });
      if (sl?.records?.length > 0) {
        let deepMin = 0, remMin = 0, lightMin = 0, totalMin = 0;
        let bedTime: string | null = null, wakeTime: string | null = null;

        for (const session of sl.records) {
          if (!bedTime || session.startTime < bedTime) bedTime = session.startTime;
          if (!wakeTime || session.endTime > wakeTime) wakeTime = session.endTime;

          if (session.stages?.length > 0) {
            for (const stage of session.stages) {
              const dur = (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) / 60000;
              switch (stage.stage) {
                case 5: deepMin += dur; totalMin += dur; break;   // Deep
                case 6: remMin += dur; totalMin += dur; break;    // REM
                case 4: case 2: lightMin += dur; totalMin += dur; break; // Light / Sleeping
              }
            }
          } else {
            const dur = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000;
            lightMin += dur;
            totalMin += dur;
          }
        }

        if (totalMin > 0 && bedTime && wakeTime) {
          const inBed = (new Date(wakeTime).getTime() - new Date(bedTime).getTime()) / 60000;
          result.sleep = {
            totalHours: Math.round((totalMin / 60) * 100) / 100,
            deepHours: Math.round((deepMin / 60) * 100) / 100,
            remHours: Math.round((remMin / 60) * 100) / 100,
            lightHours: Math.round((lightMin / 60) * 100) / 100,
            efficiency: inBed > 0 ? Math.round((totalMin / inBed) * 100) : 0,
            bedTime,
            wakeTime,
          };
        }
      }
    } catch {}

    result.recovery = calculateRecovery(result.hrv, result.restingHR);
    return result;
  } catch (error) {
    console.warn('[Wearable] Health Connect error:', error);
    return null;
  }
}

// ============================================================
// 5. API pública — Leer datos del día (cross-platform)
// ============================================================

export async function getWearableDataForDate(date: string): Promise<WearableData | null> {
  try {
    if (Platform.OS === 'ios') return await getHealthKitData(date);
    if (Platform.OS === 'android') return await getHealthConnectData(date);
    return null;
  } catch (error) {
    console.warn('[Wearable] Error obteniendo datos:', error);
    return null;
  }
}

// ============================================================
// 6. Persistir en Supabase
// ============================================================

export async function saveWearableToSupabase(userId: string, data: WearableData): Promise<boolean> {
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

    const wearableJson: Record<string, any> = { source: data.source, lastSync: data.lastSync };
    if (data.hrv != null) wearableJson.hrv = data.hrv;
    if (data.spo2 != null) wearableJson.spo2 = data.spo2;
    if (data.recovery != null) wearableJson.recovery = data.recovery;
    if (data.sleep) wearableJson.sleep = data.sleep;
    if (data.calories) wearableJson.calories = data.calories;
    payload.wearable_data = wearableJson;

    const { error } = await supabase.from('health_measurements').upsert(payload, { onConflict: 'user_id,date' });
    if (error) { console.warn('[Wearable] Supabase error:', error); return false; }
    return true;
  } catch (error) {
    console.warn('[Wearable] saveWearableToSupabase error:', error);
    return false;
  }
}

// ============================================================
// 7. Helpers
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
  try {
    const available = await isWearableAvailable();
    if (!available) return null;
    const ok = await requestWearablePermissions();
    if (!ok) return null;
    const d = date ?? new Date().toISOString().split('T')[0];
    const data = await getWearableDataForDate(d);
    if (!data) return null;
    await saveWearableToSupabase(userId, data);
    return data;
  } catch (error) {
    console.warn('[Wearable] syncWearableData error:', error);
    return null;
  }
}
