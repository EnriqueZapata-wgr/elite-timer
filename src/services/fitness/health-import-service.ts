/**
 * Health Import service (MB-3.6 Bloque 3.2) — lectura de entrenamientos desde
 * Health Connect (Android) / HealthKit (iOS) e import a cardio_sessions.
 *
 * Decisión arquitectónica (brief): NO integramos Strava/Garmin/Samsung/Google
 * por separado — todos escriben en la plataforma de salud del sistema. Una
 * integración, todas las fuentes. SOLO LECTURA y solo entrenamientos (tipo,
 * duración, distancia, FC media, calorías) — minimización de datos.
 *
 * ⚠️ DEPS NATIVAS (react-native-health-connect / @kingstinct/react-native-healthkit
 * + nitro-modules): lazy require con fail-soft (doctrina "nativos nuevos SIEMPRE
 * lazy require") — en binarios sin el módulo la pantalla lo dice honesto y no
 * crashea. El import real llega con el siguiente BUILD nativo, no por OTA.
 *
 * Import manual primero; sincronización automática es preferencia OPT-IN
 * (AsyncStorage) — nunca sincronizamos sin que el usuario lo pida.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/utils/uuid';
import { awardBooleanElectron } from '@/src/services/electron-service';
import {
  dedupeWorkouts,
  importOtorgaElectron,
  disciplineFromHealthConnect,
  disciplineFromHealthKit,
  type NormalizedWorkout,
  type ExistingSessionLike,
} from './health-import-core';

// ── Lazy natives (fail-soft en binarios sin el módulo) ──

type HealthConnectModule = typeof import('react-native-health-connect');
let healthConnect: HealthConnectModule | null = null;
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    healthConnect = require('react-native-health-connect');
  } catch { healthConnect = null; }
}

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');
let healthKit: HealthKitModule | null = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    healthKit = require('@kingstinct/react-native-healthkit');
  } catch { healthKit = null; }
}

// ── Disponibilidad ──

export type HealthPlatformStatus =
  | 'disponible'        // módulo presente y plataforma lista
  | 'sin_app'           // Android sin app Health Connect instalada/actualizada
  | 'binario_viejo'     // OTA sobre build sin el módulo nativo
  | 'no_soportado';     // web u otra plataforma

export interface HealthPlatform {
  os: 'android' | 'ios' | 'otro';
  status: HealthPlatformStatus;
  /** Nombre humano de la plataforma ("Health Connect" / "Salud de Apple"). */
  nombre: string;
}

export async function getHealthPlatform(): Promise<HealthPlatform> {
  if (Platform.OS === 'android') {
    const nombre = 'Health Connect';
    if (!healthConnect) return { os: 'android', status: 'binario_viejo', nombre };
    try {
      const status = await healthConnect.getSdkStatus();
      const disponible = status === healthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;
      return { os: 'android', status: disponible ? 'disponible' : 'sin_app', nombre };
    } catch {
      return { os: 'android', status: 'sin_app', nombre };
    }
  }
  if (Platform.OS === 'ios') {
    const nombre = 'Salud de Apple';
    if (!healthKit) return { os: 'ios', status: 'binario_viejo', nombre };
    try {
      const ok = await healthKit.isHealthDataAvailableAsync();
      return { os: 'ios', status: ok ? 'disponible' : 'no_soportado', nombre };
    } catch {
      return { os: 'ios', status: 'no_soportado', nombre };
    }
  }
  return { os: 'otro', status: 'no_soportado', nombre: 'Plataforma de salud' };
}

// ── Permisos (solo lectura, solo entrenamientos) ──

export async function solicitarPermisos(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && healthConnect) {
      await healthConnect.initialize();
      const granted = await healthConnect.requestPermission([
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
      ]);
      return granted.length > 0;
    }
    if (Platform.OS === 'ios' && healthKit) {
      return await healthKit.requestAuthorization({ toRead: ['HKWorkoutTypeIdentifier'] });
    }
  } catch (e) {
    logWarn('[health-import] permisos:', e);
  }
  return false;
}

// ── Lectura normalizada ──

function metersFrom(quantity: { unit: string; quantity: number } | undefined): number | null {
  if (!quantity || !Number.isFinite(quantity.quantity)) return null;
  const q = quantity.quantity;
  switch (quantity.unit) {
    case 'm': return Math.round(q);
    case 'km': return Math.round(q * 1000);
    case 'mi': return Math.round(q * 1609.34);
    default: return Math.round(q); // HealthKit reporta distancia en metros por default
  }
}

async function leerAndroid(desdeISO: string, hastaISO: string): Promise<NormalizedWorkout[]> {
  if (!healthConnect) return [];
  await healthConnect.initialize();
  const { records } = await healthConnect.readRecords('ExerciseSession', {
    timeRangeFilter: { operator: 'between', startTime: desdeISO, endTime: hastaISO },
  });
  const out: NormalizedWorkout[] = [];
  for (const r of records) {
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
    if (durationSeconds <= 0) continue;
    // Distancia / FC / calorías por sesión vía aggregate en su ventana —
    // fail-soft por métrica (sin el permiso o sin dato → null, no truena).
    let distanceMeters: number | null = null;
    let avgHeartRate: number | null = null;
    let calories: number | null = null;
    const ventana = { operator: 'between' as const, startTime: r.startTime, endTime: r.endTime };
    try {
      const d = await healthConnect.aggregateRecord({ recordType: 'Distance', timeRangeFilter: ventana });
      const m = (d as { DISTANCE?: { inMeters?: number } }).DISTANCE?.inMeters;
      if (m != null && m > 0) distanceMeters = Math.round(m);
    } catch { /* sin distancia */ }
    try {
      const h = await healthConnect.aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: ventana });
      const bpm = (h as { BPM_AVG?: number }).BPM_AVG;
      if (bpm != null && bpm > 0) avgHeartRate = Math.round(bpm);
    } catch { /* sin FC */ }
    try {
      const c = await healthConnect.aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter: ventana });
      const kcal = (c as { ENERGY_TOTAL?: { inKilocalories?: number } }).ENERGY_TOTAL?.inKilocalories;
      if (kcal != null && kcal > 0) calories = Math.round(kcal);
    } catch { /* sin calorías */ }
    out.push({
      externalId: r.metadata?.id ?? `hc-${r.startTime}`,
      discipline: disciplineFromHealthConnect(r.exerciseType),
      dateLocal: toLocalDateString(start),
      durationSeconds,
      distanceMeters,
      avgHeartRate,
      calories,
      source: 'health_connect',
    });
  }
  return out;
}

async function leerIOS(desde: Date): Promise<NormalizedWorkout[]> {
  if (!healthKit) return [];
  const proxies = await healthKit.queryWorkoutSamples({ limit: 200, ascending: false });
  const out: NormalizedWorkout[] = [];
  for (const p of proxies) {
    const sample = p.toJSON();
    const start = new Date(sample.startDate);
    if (start < desde) continue;
    const durationSeconds = Math.round(sample.duration?.quantity ?? 0);
    if (durationSeconds <= 0) continue;
    out.push({
      externalId: sample.uuid,
      discipline: disciplineFromHealthKit(sample.workoutActivityType as unknown as number),
      dateLocal: toLocalDateString(start),
      durationSeconds,
      distanceMeters: metersFrom(sample.totalDistance),
      avgHeartRate: null, // FC media requiere query extra por workout — omitido (minimización)
      calories: sample.totalEnergyBurned ? Math.round(sample.totalEnergyBurned.quantity) : null,
      source: 'healthkit',
    });
  }
  return out;
}

/** Entrenamientos de la plataforma de salud de los últimos `diasAtras` días. */
export async function leerEntrenamientos(diasAtras = 14): Promise<NormalizedWorkout[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasAtras);
  try {
    if (Platform.OS === 'android') return await leerAndroid(desde.toISOString(), new Date().toISOString());
    if (Platform.OS === 'ios') return await leerIOS(desde);
  } catch (e) {
    logWarn('[health-import] lectura:', e);
  }
  return [];
}

// ── Import a cardio_sessions (dedupe + economía capeada) ──

export interface ImportResult {
  ok: boolean;
  importados: number;
  duplicados: number;
  electronHoy: boolean;
  error?: string;
}

export async function importarEntrenamientos(userId: string, candidatos: NormalizedWorkout[]): Promise<ImportResult> {
  try {
    if (candidatos.length === 0) return { ok: true, importados: 0, duplicados: 0, electronHoy: false };
    const desde = [...candidatos].map((c) => c.dateLocal).sort()[0];
    const { data: existentes, error: exErr } = await supabase
      .from('cardio_sessions')
      .select('date, discipline, duration_seconds, external_id')
      .eq('user_id', userId)
      .gte('date', desde);
    if (exErr) throw new Error(exErr.message);

    const { nuevos, duplicados } = dedupeWorkouts(candidatos, (existentes ?? []) as ExistingSessionLike[]);
    if (nuevos.length === 0) return { ok: true, importados: 0, duplicados: duplicados.length, electronHoy: false };

    const rows = nuevos.map((w) => ({
      id: generateUUID(),
      user_id: userId,
      date: w.dateLocal,
      discipline: w.discipline,
      duration_seconds: w.durationSeconds,
      distance_meters: w.distanceMeters,
      avg_pace_seconds_per_km: w.distanceMeters && w.distanceMeters > 0
        ? Math.round(w.durationSeconds / (w.distanceMeters / 1000))
        : null,
      avg_heart_rate: w.avgHeartRate,
      calories_burned: w.calories,
      source: w.source,
      external_id: w.externalId,
    }));
    const { error: insErr } = await supabase.from('cardio_sessions').insert(rows);
    if (insErr) throw new Error(insErr.message);

    // ECONOMÍA: mismo award booleano idempotente que el manual, SOLO si hay
    // entrenamiento nuevo de HOY (cero retroactividad — brief 3.2).
    let electronHoy = false;
    if (importOtorgaElectron(nuevos, getLocalToday())) {
      try {
        await awardBooleanElectron(userId, 'cardio');
        electronHoy = true;
      } catch { /* fail-soft: el import vale aunque el award falle */ }
    }

    return { ok: true, importados: nuevos.length, duplicados: duplicados.length, electronHoy };
  } catch (e) {
    logWarn('[health-import] importar:', e);
    return {
      ok: false, importados: 0, duplicados: 0, electronHoy: false,
      error: e instanceof Error ? e.message : 'No se pudo importar.',
    };
  }
}

// ── Auto-sync (opt-in explícito) ──

const AUTO_SYNC_KEY = 'cardio_health_autosync_v1';

export async function getAutoSync(): Promise<boolean> {
  return (await AsyncStorage.getItem(AUTO_SYNC_KEY).catch(() => null)) === '1';
}

export async function setAutoSync(v: boolean): Promise<void> {
  await AsyncStorage.setItem(AUTO_SYNC_KEY, v ? '1' : '0').catch(() => {});
}

/** Sync silencioso (solo si el usuario activó el opt-in). Devuelve importados. */
export async function autoSyncSiActiva(userId: string): Promise<number> {
  if (!(await getAutoSync())) return 0;
  const plataforma = await getHealthPlatform();
  if (plataforma.status !== 'disponible') return 0;
  const workouts = await leerEntrenamientos(3);
  if (workouts.length === 0) return 0;
  const res = await importarEntrenamientos(userId, workouts);
  return res.ok ? res.importados : 0;
}
