/**
 * Sleep import service (MB-30A · Pieza 2) — el sueño que el teléfono YA mide.
 *
 * Segunda vía del módulo de sueño, para no depender de que el Sleep Cycle
 * se use: HealthKit en iPhone y Health Connect en Android. REÚSA el camino
 * del import de entrenamientos (MB-3.6): mismos módulos nativos con lazy
 * require fail-soft, mismo gate del delegate en Android (binarios viejos
 * crashean NATIVO al abrir el diálogo de permisos), misma plataforma
 * (getHealthPlatform). Una integración, todas las fuentes.
 *
 * Quién manda: el import NUNCA pisa una noche existente — upsert con
 * ignoreDuplicates (ON CONFLICT DO NOTHING). La sesión propia del Sleep
 * Cycle sí pisa (ver sleep-session-service). Una noche, un registro,
 * una sola verdad.
 *
 * ⚠️ Lección MB-27: el CHECK de source de sleep_nights (261) nace con
 * 'health_connect' y 'healthkit' desde el día uno, y el cruce vive en
 * sleep-source-contract.test.ts.
 */
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { binarioConDelegate } from '@/src/services/fitness/health-import-service';
import {
  esValorDormidoHK,
  nochesDesdeTramos,
  type NocheImportada,
  type TramoSueno,
} from './sleep-import-core';

// ── Lazy natives (mismo patrón fail-soft del health import) ──

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

// ── Permisos (solo lectura, solo sueño) ──

/** ¿La lectura de sueño ya está concedida en Health Connect? (sin diálogos). */
async function lecturaSuenoConcedidaAndroid(): Promise<boolean> {
  if (!healthConnect) return false;
  const granted = await healthConnect.getGrantedPermissions();
  return granted.some(
    (p) => 'recordType' in p && p.recordType === 'SleepSession' && p.accessType === 'read',
  );
}

export type ResultadoPermisosSueno =
  | 'ok'
  | 'denegado'
  | 'dialogo_no_disponible'; // binario sin delegate: abrir el diálogo crashea nativo

export async function solicitarPermisosSueno(): Promise<ResultadoPermisosSueno> {
  try {
    if (Platform.OS === 'android' && healthConnect) {
      await healthConnect.initialize();
      if (await lecturaSuenoConcedidaAndroid()) return 'ok';
      if (!binarioConDelegate()) return 'dialogo_no_disponible';
      const granted = await healthConnect.requestPermission([
        { accessType: 'read', recordType: 'SleepSession' },
      ]);
      return granted.length > 0 ? 'ok' : 'denegado';
    }
    if (Platform.OS === 'ios' && healthKit) {
      const ok = await healthKit.requestAuthorization({
        toRead: ['HKCategoryTypeIdentifierSleepAnalysis'],
      });
      return ok ? 'ok' : 'denegado';
    }
  } catch (e) {
    logWarn('[sleep-import] permisos:', e);
  }
  return 'denegado';
}

/** Re-check tras conceder desde los ajustes de Health Connect (sin diálogos). */
export async function permisosSuenoYaConcedidos(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && healthConnect) {
      await healthConnect.initialize();
      return await lecturaSuenoConcedidaAndroid();
    }
  } catch (e) {
    logWarn('[sleep-import] re-check permisos:', e);
  }
  return false;
}

// ── Lectura normalizada ──

async function leerTramosAndroid(desdeISO: string, hastaISO: string): Promise<TramoSueno[]> {
  if (!healthConnect) return [];
  await healthConnect.initialize();
  const { records } = await healthConnect.readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime: desdeISO, endTime: hastaISO },
  });
  const out: TramoSueno[] = [];
  for (const r of records) {
    const startMs = new Date(r.startTime).getTime();
    const endMs = new Date(r.endTime).getTime();
    out.push({ startMs, endMs, externalId: r.metadata?.id ?? `hc-sleep-${r.startTime}` });
  }
  return out;
}

async function leerTramosIOS(desde: Date): Promise<TramoSueno[]> {
  if (!healthKit) return [];
  const samples = await healthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
    limit: 2000,
    ascending: false,
  });
  const out: TramoSueno[] = [];
  for (const s of samples) {
    const start = new Date(s.startDate);
    if (start < desde) continue;
    // Solo lo DORMIDO cuenta (fuera "en cama" y "despierto"); los tipos
    // específicos se suman parejo — no persistimos ni prometemos fases.
    if (!esValorDormidoHK(s.value as unknown as number)) continue;
    out.push({
      startMs: start.getTime(),
      endMs: new Date(s.endDate).getTime(),
      externalId: s.uuid,
    });
  }
  return out;
}

/** Noches dormidas según la plataforma de salud, últimos `diasAtras` días. */
export async function leerNochesDeSalud(diasAtras = 14): Promise<NocheImportada[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasAtras);
  try {
    if (Platform.OS === 'android') {
      const tramos = await leerTramosAndroid(desde.toISOString(), new Date().toISOString());
      return nochesDesdeTramos(tramos, 'health_connect', toLocalDateString);
    }
    if (Platform.OS === 'ios') {
      const tramos = await leerTramosIOS(desde);
      return nochesDesdeTramos(tramos, 'healthkit', toLocalDateString);
    }
  } catch (e) {
    logWarn('[sleep-import] lectura:', e);
  }
  return [];
}

// ── Import a sleep_nights (el import NUNCA pisa) ──

export interface ImportSuenoResult {
  ok: boolean;
  /** Noches nuevas escritas (las ya existentes no se tocan). */
  importadas: number;
  error?: string;
}

export async function importarNoches(
  userId: string,
  noches: NocheImportada[],
): Promise<ImportSuenoResult> {
  try {
    if (noches.length === 0) return { ok: true, importadas: 0 };
    const rows = noches.map((n) => ({
      user_id: userId,
      night_date: n.nightDate,
      bed_time: n.bedTimeISO,
      wake_time: n.wakeTimeISO,
      duration_minutes: n.durationMinutes,
      score: null,
      snore_minutes: null,
      source: n.source,
      external_id: n.externalId,
    }));
    // UNA NOCHE, UN REGISTRO: ignoreDuplicates = ON CONFLICT DO NOTHING.
    // Si esa noche ya existe (sesión propia o import previo), se respeta.
    const { data, error } = await supabase
      .from('sleep_nights')
      .upsert(rows, { onConflict: 'user_id,night_date', ignoreDuplicates: true })
      .select('night_date');
    if (error) throw new Error(error.message);
    return { ok: true, importadas: (data ?? []).length };
  } catch (e) {
    logWarn('[sleep-import] importar:', e);
    return {
      ok: false,
      importadas: 0,
      error: e instanceof Error ? e.message : 'No se pudo importar.',
    };
  }
}
