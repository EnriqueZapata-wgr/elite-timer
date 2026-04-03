/**
 * Servicio de wearables — Integración con Apple HealthKit y Google Health Connect.
 *
 * Todo el código nativo está envuelto en try/catch con dynamic require.
 * Si el módulo no existe (OTA update sin build nativo), retorna null silenciosamente.
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
  source: string;                   // 'apple_healthkit' | 'google_health_connect'
  lastSync: string;                 // ISO timestamp
  sleep?: {
    totalHours: number;
    deepHours: number;
    remHours: number;
    lightHours: number;
    efficiency: number;             // 0-100
    bedTime: string;                // ISO timestamp
    wakeTime: string;               // ISO timestamp
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

/** Inicio del día (00:00) para una fecha YYYY-MM-DD */
function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  return d;
}

/** Fin del día (23:59:59.999) para una fecha YYYY-MM-DD */
function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr + 'T23:59:59.999');
  return d;
}

/** Calcula un score de recuperación basado en HRV + resting HR */
function calculateRecovery(hrv?: number, restingHR?: number): number | undefined {
  if (hrv == null && restingHR == null) return undefined;
  let score = 50;
  if (hrv != null) {
    // HRV >60ms = excelente, <20ms = bajo
    score = Math.min(100, Math.max(0, (hrv / 80) * 100));
  }
  if (restingHR != null) {
    // Penalizar HR alta: <50 = excelente, >90 = bajo
    const hrPenalty = Math.max(0, (restingHR - 50) * 0.5);
    score = Math.max(0, score - hrPenalty);
  }
  return Math.round(score);
}

// ============================================================
// 1. Verificar disponibilidad
// ============================================================

/**
 * Verifica si el módulo nativo de salud está disponible.
 * Usa dynamic require — si el paquete no está instalado retorna false.
 */
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
    // Web u otra plataforma — no soportado
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// 2. Solicitar permisos
// ============================================================

/**
 * Solicita permisos de lectura para los tipos de datos que necesitamos.
 * Retorna true si se otorgaron (o ya estaban otorgados), false en error.
 */
export async function requestWearablePermissions(): Promise<boolean> {
  // --- iOS: Apple HealthKit ---
  if (Platform.OS === 'ios') {
    try {
      const HK = require('@kingstinct/react-native-healthkit');
      const {
        HKQuantityTypeIdentifier,
        HKCategoryTypeIdentifier,
      } = HK;

      // Tipos de datos que queremos leer
      const readPermissions = [
        HKQuantityTypeIdentifier.stepCount,
        HKQuantityTypeIdentifier.heartRate,
        HKQuantityTypeIdentifier.restingHeartRate,
        HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
        HKQuantityTypeIdentifier.oxygenSaturation,
        HKQuantityTypeIdentifier.activeEnergyBurned,
        HKQuantityTypeIdentifier.basalEnergyBurned,
        HKQuantityTypeIdentifier.appleExerciseTime,
        HKCategoryTypeIdentifier.sleepAnalysis,
      ];

      await HK.requestAuthorization(readPermissions, []);
      return true;
    } catch (error) {
      console.warn('[Wearable] Error solicitando permisos HealthKit:', error);
      return false;
    }
  }

  // --- Android: Google Health Connect ---
  if (Platform.OS === 'android') {
    try {
      const HC = require('react-native-health-connect');

      // Inicializar SDK primero
      const isInitialized = await HC.initialize();
      if (!isInitialized) {
        console.warn('[Wearable] Health Connect no se pudo inicializar');
        return false;
      }

      // Solicitar permisos de lectura
      const granted = await HC.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]);

      return Array.isArray(granted) && granted.length > 0;
    } catch (error) {
      console.warn('[Wearable] Error solicitando permisos Health Connect:', error);
      return false;
    }
  }

  return false;
}

// ============================================================
// 3. Leer datos del día — Apple HealthKit (iOS)
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

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Para sueño buscamos 12h atrás desde el inicio del día (capturar sueño nocturno)
    const sleepSearchStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);

    const result: WearableData = {
      source: 'apple_healthkit',
      lastSync: new Date().toISOString(),
    };

    // --- Pasos ---
    try {
      const stepsResult = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.stepCount,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        },
      );
      if (stepsResult?.sumQuantity?.doubleValue != null) {
        result.steps = Math.round(stepsResult.sumQuantity.doubleValue);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo pasos HK:', e);
    }

    // --- Frecuencia cardíaca en reposo ---
    try {
      const restingHRSamples = await queryQuantitySamples(
        HKQuantityTypeIdentifier.restingHeartRate,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          ascending: false,
          limit: 1,
        },
      );
      if (restingHRSamples?.length > 0) {
        result.restingHR = Math.round(restingHRSamples[0].quantity);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo resting HR HK:', e);
    }

    // --- HRV (SDNN) ---
    try {
      const hrvSamples = await queryQuantitySamples(
        HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          ascending: false,
          limit: 1,
        },
      );
      if (hrvSamples?.length > 0) {
        result.hrv = Math.round(hrvSamples[0].quantity * 10) / 10;
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo HRV HK:', e);
    }

    // --- SpO2 ---
    try {
      const spo2Samples = await queryQuantitySamples(
        HKQuantityTypeIdentifier.oxygenSaturation,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          ascending: false,
          limit: 1,
        },
      );
      if (spo2Samples?.length > 0) {
        // HealthKit da SpO2 como fracción (0-1), convertir a porcentaje
        result.spo2 = Math.round(spo2Samples[0].quantity * 100);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo SpO2 HK:', e);
    }

    // --- Calorías activas ---
    let activeCals = 0;
    try {
      const activeResult = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.activeEnergyBurned,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        },
      );
      if (activeResult?.sumQuantity?.doubleValue != null) {
        activeCals = Math.round(activeResult.sumQuantity.doubleValue);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo calorías activas HK:', e);
    }

    // --- Calorías basales ---
    let basalCals = 0;
    try {
      const basalResult = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.basalEnergyBurned,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        },
      );
      if (basalResult?.sumQuantity?.doubleValue != null) {
        basalCals = Math.round(basalResult.sumQuantity.doubleValue);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo calorías basales HK:', e);
    }

    if (activeCals > 0 || basalCals > 0) {
      result.calories = {
        active: activeCals,
        basal: basalCals,
        total: activeCals + basalCals,
      };
    }

    // --- Minutos de ejercicio (Apple Exercise Time) ---
    try {
      const exerciseResult = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.appleExerciseTime,
        {
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        },
      );
      if (exerciseResult?.sumQuantity?.doubleValue != null) {
        result.activeMinutes = Math.round(exerciseResult.sumQuantity.doubleValue);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo minutos ejercicio HK:', e);
    }

    // --- Sueño (buscar 12h atrás para capturar la noche anterior) ---
    try {
      const sleepSamples = await queryCategorySamples(
        HKCategoryTypeIdentifier.sleepAnalysis,
        {
          from: sleepSearchStart.toISOString(),
          to: dayEnd.toISOString(),
          ascending: true,
        },
      );

      if (sleepSamples?.length > 0) {
        let deepMinutes = 0;
        let remMinutes = 0;
        let coreMinutes = 0;   // light / core
        let totalMinutes = 0;
        let bedTime: string | null = null;
        let wakeTime: string | null = null;

        for (const sample of sleepSamples) {
          const sampleStart = new Date(sample.startDate).getTime();
          const sampleEnd = new Date(sample.endDate).getTime();
          const durationMin = (sampleEnd - sampleStart) / (1000 * 60);

          // Registrar hora de dormir y despertar
          if (!bedTime || new Date(sample.startDate) < new Date(bedTime)) {
            bedTime = sample.startDate;
          }
          if (!wakeTime || new Date(sample.endDate) > new Date(wakeTime)) {
            wakeTime = sample.endDate;
          }

          // Clasificar etapas de sueño
          // value: 0 = InBed, 1 = AsleepUnspecified, 2 = Awake,
          //        3 = AsleepCore, 4 = AsleepDeep, 5 = AsleepREM
          switch (sample.value) {
            case 4: // AsleepDeep
              deepMinutes += durationMin;
              totalMinutes += durationMin;
              break;
            case 5: // AsleepREM
              remMinutes += durationMin;
              totalMinutes += durationMin;
              break;
            case 3: // AsleepCore (light)
              coreMinutes += durationMin;
              totalMinutes += durationMin;
              break;
            case 1: // AsleepUnspecified — contar como light
              coreMinutes += durationMin;
              totalMinutes += durationMin;
              break;
            // InBed (0) y Awake (2) no se suman al sueño total
          }
        }

        if (totalMinutes > 0 && bedTime && wakeTime) {
          const timeInBed = (new Date(wakeTime).getTime() - new Date(bedTime).getTime()) / (1000 * 60);
          result.sleep = {
            totalHours: Math.round((totalMinutes / 60) * 100) / 100,
            deepHours: Math.round((deepMinutes / 60) * 100) / 100,
            remHours: Math.round((remMinutes / 60) * 100) / 100,
            lightHours: Math.round((coreMinutes / 60) * 100) / 100,
            efficiency: timeInBed > 0 ? Math.round((totalMinutes / timeInBed) * 100) : 0,
            bedTime,
            wakeTime,
          };
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo sueño HK:', e);
    }

    // --- Recovery score derivado ---
    result.recovery = calculateRecovery(result.hrv, result.restingHR);

    return result;
  } catch (error) {
    console.warn('[Wearable] HealthKit no disponible:', error);
    return null;
  }
}

// ============================================================
// 4. Leer datos del día — Google Health Connect (Android)
// ============================================================

async function getHealthConnectData(date: string): Promise<WearableData | null> {
  try {
    const HC = require('react-native-health-connect');

    // Inicializar SDK
    const isInitialized = await HC.initialize();
    if (!isInitialized) {
      console.warn('[Wearable] Health Connect no se pudo inicializar');
      return null;
    }

    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    // Para sueño buscamos 12h atrás desde el inicio del día
    const sleepSearchStart = new Date(
      startOfDay(date).getTime() - 12 * 60 * 60 * 1000,
    ).toISOString();

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: dayStart,
      endTime: dayEnd,
    };

    const sleepTimeRange = {
      operator: 'between' as const,
      startTime: sleepSearchStart,
      endTime: dayEnd,
    };

    const result: WearableData = {
      source: 'google_health_connect',
      lastSync: new Date().toISOString(),
    };

    // --- Pasos ---
    try {
      const stepsRecords = await HC.readRecords('Steps', { timeRangeFilter });
      if (stepsRecords?.records?.length > 0) {
        result.steps = stepsRecords.records.reduce(
          (sum: number, r: any) => sum + (r.count || 0),
          0,
        );
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo pasos HC:', e);
    }

    // --- Frecuencia cardíaca en reposo ---
    try {
      const restingHRRecords = await HC.readRecords('RestingHeartRate', {
        timeRangeFilter,
      });
      if (restingHRRecords?.records?.length > 0) {
        // Tomar el último registro del día
        const lastRecord = restingHRRecords.records[restingHRRecords.records.length - 1];
        if (lastRecord.samples?.length > 0) {
          result.restingHR = Math.round(
            lastRecord.samples[lastRecord.samples.length - 1].beatsPerMinute,
          );
        } else if (lastRecord.beatsPerMinute != null) {
          result.restingHR = Math.round(lastRecord.beatsPerMinute);
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo resting HR HC:', e);
    }

    // --- HRV (RMSSD — Health Connect usa RMSSD en vez de SDNN) ---
    try {
      const hrvRecords = await HC.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter,
      });
      if (hrvRecords?.records?.length > 0) {
        const lastHrv = hrvRecords.records[hrvRecords.records.length - 1];
        if (lastHrv.heartRateVariabilityMillis != null) {
          result.hrv = Math.round(lastHrv.heartRateVariabilityMillis * 10) / 10;
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo HRV HC:', e);
    }

    // --- SpO2 ---
    try {
      const spo2Records = await HC.readRecords('OxygenSaturation', {
        timeRangeFilter,
      });
      if (spo2Records?.records?.length > 0) {
        const lastSpo2 = spo2Records.records[spo2Records.records.length - 1];
        if (lastSpo2.percentage != null) {
          result.spo2 = Math.round(lastSpo2.percentage);
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo SpO2 HC:', e);
    }

    // --- Calorías activas ---
    let activeCals = 0;
    try {
      const activeCalRecords = await HC.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter,
      });
      if (activeCalRecords?.records?.length > 0) {
        activeCals = activeCalRecords.records.reduce(
          (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
          0,
        );
        activeCals = Math.round(activeCals);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo calorías activas HC:', e);
    }

    // --- Calorías basales (estimación desde BasalMetabolicRate) ---
    let basalCals = 0;
    try {
      const basalRecords = await HC.readRecords('BasalMetabolicRate', {
        timeRangeFilter,
      });
      if (basalRecords?.records?.length > 0) {
        // BasalMetabolicRate es kcal/día; tomar el último registro
        const lastBasal = basalRecords.records[basalRecords.records.length - 1];
        if (lastBasal.basalMetabolicRate?.inKilocaloriesPerDay != null) {
          basalCals = Math.round(lastBasal.basalMetabolicRate.inKilocaloriesPerDay);
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo calorías basales HC:', e);
    }

    if (activeCals > 0 || basalCals > 0) {
      result.calories = {
        active: activeCals,
        basal: basalCals,
        total: activeCals + basalCals,
      };
    }

    // --- Minutos de ejercicio ---
    try {
      const exerciseRecords = await HC.readRecords('ExerciseSession', {
        timeRangeFilter,
      });
      if (exerciseRecords?.records?.length > 0) {
        let totalMinutes = 0;
        for (const session of exerciseRecords.records) {
          const startMs = new Date(session.startTime).getTime();
          const endMs = new Date(session.endTime).getTime();
          totalMinutes += (endMs - startMs) / (1000 * 60);
        }
        result.activeMinutes = Math.round(totalMinutes);
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo ejercicio HC:', e);
    }

    // --- Sueño ---
    try {
      const sleepRecords = await HC.readRecords('SleepSession', {
        timeRangeFilter: sleepTimeRange,
      });

      if (sleepRecords?.records?.length > 0) {
        let deepMinutes = 0;
        let remMinutes = 0;
        let lightMinutes = 0;
        let totalMinutes = 0;
        let bedTime: string | null = null;
        let wakeTime: string | null = null;

        for (const session of sleepRecords.records) {
          // Registrar hora de dormir y despertar
          if (!bedTime || session.startTime < bedTime) {
            bedTime = session.startTime;
          }
          if (!wakeTime || session.endTime > wakeTime) {
            wakeTime = session.endTime;
          }

          // Procesar etapas si están disponibles
          if (session.stages?.length > 0) {
            for (const stage of session.stages) {
              const stageStart = new Date(stage.startTime).getTime();
              const stageEnd = new Date(stage.endTime).getTime();
              const durationMin = (stageEnd - stageStart) / (1000 * 60);

              // Tipos de etapa en Health Connect:
              // 1 = Awake, 2 = Sleeping, 3 = OutOfBed,
              // 4 = Light, 5 = Deep, 6 = REM
              switch (stage.stage) {
                case 5: // Deep
                  deepMinutes += durationMin;
                  totalMinutes += durationMin;
                  break;
                case 6: // REM
                  remMinutes += durationMin;
                  totalMinutes += durationMin;
                  break;
                case 4: // Light
                  lightMinutes += durationMin;
                  totalMinutes += durationMin;
                  break;
                case 2: // Sleeping (genérico, contar como light)
                  lightMinutes += durationMin;
                  totalMinutes += durationMin;
                  break;
                // Awake (1) y OutOfBed (3) no se suman
              }
            }
          } else {
            // Sin etapas — usar duración total de la sesión
            const sessionStart = new Date(session.startTime).getTime();
            const sessionEnd = new Date(session.endTime).getTime();
            const sessionMin = (sessionEnd - sessionStart) / (1000 * 60);
            lightMinutes += sessionMin;
            totalMinutes += sessionMin;
          }
        }

        if (totalMinutes > 0 && bedTime && wakeTime) {
          const timeInBed = (new Date(wakeTime).getTime() - new Date(bedTime).getTime()) / (1000 * 60);
          result.sleep = {
            totalHours: Math.round((totalMinutes / 60) * 100) / 100,
            deepHours: Math.round((deepMinutes / 60) * 100) / 100,
            remHours: Math.round((remMinutes / 60) * 100) / 100,
            lightHours: Math.round((lightMinutes / 60) * 100) / 100,
            efficiency: timeInBed > 0 ? Math.round((totalMinutes / timeInBed) * 100) : 0,
            bedTime,
            wakeTime,
          };
        }
      }
    } catch (e) {
      console.warn('[Wearable] Error leyendo sueño HC:', e);
    }

    // --- Recovery score derivado ---
    result.recovery = calculateRecovery(result.hrv, result.restingHR);

    return result;
  } catch (error) {
    console.warn('[Wearable] Health Connect no disponible:', error);
    return null;
  }
}

// ============================================================
// 5. API pública — Leer datos del día (cross-platform)
// ============================================================

/**
 * Lee todos los datos de salud del wearable para una fecha dada.
 * Detecta la plataforma y llama al módulo correspondiente.
 * Retorna null si no hay módulo nativo o si ocurre un error.
 */
export async function getWearableDataForDate(date: string): Promise<WearableData | null> {
  try {
    const available = await isWearableAvailable();
    if (!available) return null;

    if (Platform.OS === 'ios') {
      return await getHealthKitData(date);
    }
    if (Platform.OS === 'android') {
      return await getHealthConnectData(date);
    }

    return null;
  } catch (error) {
    console.warn('[Wearable] Error obteniendo datos:', error);
    return null;
  }
}

// ============================================================
// 6. Persistir en Supabase
// ============================================================

/**
 * Guarda (upsert) los datos del wearable en la tabla health_measurements.
 * Mapea los campos del wearable a las columnas existentes de la tabla.
 */
export async function saveWearableToSupabase(
  userId: string,
  data: WearableData,
): Promise<boolean> {
  try {
    const date = data.lastSync.split('T')[0]; // YYYY-MM-DD

    const payload: Record<string, any> = {
      user_id: userId,
      date,
      updated_at: new Date().toISOString(),
    };

    // Mapear datos del wearable a columnas de health_measurements
    if (data.restingHR != null) payload.resting_hr = data.restingHR;
    if (data.sleep?.totalHours != null) payload.sleep_hours = data.sleep.totalHours;
    if (data.steps != null) payload.steps_daily = data.steps;
    if (data.activeMinutes != null) payload.exercise_min_weekly = data.activeMinutes;

    // Campos extendidos del wearable (se guardan en un campo JSON si existe)
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
// 7. Helpers de estado de conexión
// ============================================================

/** Retorna el nombre de la fuente conectada según la plataforma */
export function getConnectedSource(): string {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Google Health';
  return 'Desconocido';
}

/** Placeholder para desconectar — en la práctica solo limpia estado local */
export async function disconnectWearable(): Promise<void> {
  // Los permisos de HealthKit/Health Connect se revocan desde Ajustes del OS.
  // Aquí solo marcamos la intención del usuario.
  console.log('[Wearable] Desconexión solicitada por el usuario');
}

// 8. Sincronización completa (conveniencia)
// ============================================================

/**
 * Flujo completo: solicitar permisos -> leer datos de hoy -> guardar en Supabase.
 * Pensado para llamarse desde un botón "Sincronizar Wearable" en la UI.
 */
export async function syncWearableData(userId: string, date?: string): Promise<WearableData | null> {
  try {
    const available = await isWearableAvailable();
    if (!available) {
      console.log('[Wearable] No hay módulo de salud disponible');
      return null;
    }

    // Solicitar permisos (si ya están, es no-op)
    const hasPermission = await requestWearablePermissions();
    if (!hasPermission) {
      console.warn('[Wearable] No se otorgaron permisos');
      return null;
    }

    // Leer datos del día
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const data = await getWearableDataForDate(targetDate);
    if (!data) {
      console.log('[Wearable] No se obtuvieron datos del wearable');
      return null;
    }

    // Persistir en Supabase
    await saveWearableToSupabase(userId, data);

    return data;
  } catch (error) {
    console.warn('[Wearable] Error en syncWearableData:', error);
    return null;
  }
}
