/**
 * Health platform service (NOCHE-1) — la ÚNICA puerta a la salud del sistema.
 *
 * Health Connect (Android) y Salud de Apple (iOS) detrás de una sola interfaz:
 * fuera de este archivo nadie pregunta en qué sistema operativo corre la app,
 * nadie conoce un recordType y nadie llama a un módulo nativo.
 *
 * Decisión heredada de MB-3.6 y respetada aquí: NO integramos Strava, Garmin,
 * Samsung, Oura ni Whoop por separado. Todos escriben en la plataforma de
 * salud del sistema. Una integración, todas las fuentes.
 *
 * ⚠️ DEPS NATIVAS: lazy require con fail-soft (doctrina "nativos nuevos SIEMPRE
 * lazy require"). Un OTA sobre un binario que no trae el módulo NO puede
 * crashear: cae a estado 'sin_modulo' y lo dice.
 *
 * ⚠️ NINGUNA llamada nativa se espera para siempre. Todas pasan por conLimite:
 * initialize() de Health Connect puede colgarse cuando la app del sistema está
 * a medio actualizar, y una promesa que nunca resuelve es exactamente como se
 * fabrica una pantalla eternamente en "Cargando...".
 *
 * La lógica pura vive en health-metrics-core.ts y se reexporta aquí.
 */
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { binarioConDelegate } from '@/src/services/fitness/health-import-service';
import { leerNochesDeSalud } from '@/src/services/sleep/sleep-import-service';
import {
  DEFINICIONES,
  METRICAS,
  aKilocalorias,
  aKilogramos,
  diaVacio,
  diasConDatos,
  resolverEstado,
  sanear,
  ventanaDeFechas,
  type DiaSalud,
  type EstadoSalud,
  type MetricaSalud,
} from './health-metrics-core';

export {
  DEFINICIONES,
  METRICAS,
  RANGOS,
  definicionDe,
  diaVacio,
  diasConDatos,
  metricasPresentes,
  puedeLeer,
  resolverEstado,
  sanear,
  tieneDatos,
} from './health-metrics-core';
export type {
  AccionConexion,
  DiaSalud,
  EstadoConexion,
  EstadoSalud,
  MetricaSalud,
} from './health-metrics-core';

// ── Lazy natives (mismo patrón fail-soft del import de entrenamientos) ──

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

// ── Anti-cuelgue ──

const LIMITE_MS = 8000;

/**
 * Toda promesa nativa con fecha de caducidad. Si la plataforma no contesta,
 * devolvemos el valor de respaldo y la UI sigue viva diciendo la verdad.
 */
function conLimite<T>(p: Promise<T>, respaldo: T, ms = LIMITE_MS): Promise<T> {
  return new Promise<T>((resolve) => {
    let resuelto = false;
    const t = setTimeout(() => {
      if (resuelto) return;
      resuelto = true;
      logWarn('[health-platform] la plataforma no contestó en', ms, 'ms');
      resolve(respaldo);
    }, ms);
    p.then((v) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(t);
      logWarn('[health-platform] falló la plataforma:', e);
      resolve(respaldo);
    });
  });
}

// ── Memoria local ──

const K_PEDIDO = 'health_os_permiso_pedido_v1';
const K_SYNC = 'health_os_sync_automatica_v1';
const K_ULTIMO = 'health_os_ultimo_sync_v1';

async function leerBandera(k: string): Promise<boolean> {
  return (await AsyncStorage.getItem(k).catch(() => null)) === '1';
}

// ── Estado ──

const NOMBRE_PLATAFORMA =
  Platform.OS === 'android' ? 'Health Connect'
  : Platform.OS === 'ios' ? 'Salud de Apple'
  : 'Plataforma de salud';

function osActual(): 'android' | 'ios' | 'otro' {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'otro';
}

/** Métricas que Health Connect ya concedió (no abre ningún diálogo). */
async function concedidasAndroid(): Promise<MetricaSalud[]> {
  if (!healthConnect) return [];
  const hc = healthConnect;
  const otorgados = await conLimite(
    (async () => {
      await hc.initialize();
      return hc.getGrantedPermissions();
    })(),
    [] as Awaited<ReturnType<HealthConnectModule['getGrantedPermissions']>>,
  );
  return DEFINICIONES.filter((d) =>
    otorgados.some((p) => 'recordType' in p && p.recordType === d.android && p.accessType === 'read'),
  ).map((d) => d.id);
}

/**
 * iOS no dice qué concedió de LECTURA: Apple lo esconde a propósito para que
 * una app no pueda deducir que le negaste algo (deducirlo ya sería un dato
 * sobre ti). Así que aquí lo único honesto es recordar qué pedimos, y dejar
 * que la pantalla avise que si no aparecen datos, se revisa en Salud.
 */
async function concedidasIOS(): Promise<MetricaSalud[]> {
  return (await leerBandera(K_PEDIDO)) ? [...METRICAS] : [];
}

export async function leerEstado(): Promise<EstadoSalud> {
  const os = osActual();
  const moduloPresente = os === 'android' ? !!healthConnect : os === 'ios' ? !!healthKit : false;
  const yaSePidio = await leerBandera(K_PEDIDO);

  let sdkDisponible = true;
  if (os === 'android' && healthConnect) {
    const hc = healthConnect;
    sdkDisponible = await conLimite(
      (async () => (await hc.getSdkStatus()) === hc.SdkAvailabilityStatus.SDK_AVAILABLE)(),
      false,
    );
  }
  if (os === 'ios' && healthKit) {
    const hk = healthKit;
    sdkDisponible = await conLimite(hk.isHealthDataAvailableAsync(), false);
  }

  const metricasConcedidas = !moduloPresente || !sdkDisponible
    ? []
    : os === 'android' ? await concedidasAndroid()
    : os === 'ios' ? await concedidasIOS()
    : [];

  return resolverEstado({
    os,
    plataforma: NOMBRE_PLATAFORMA,
    moduloPresente,
    // iOS no tiene app que instalar: si el módulo está, la plataforma está.
    sdkDisponible: os === 'ios' ? true : sdkDisponible,
    yaSePidio,
    metricasConcedidas,
    dialogoDisponible: os === 'android' ? binarioConDelegate() : true,
  });
}

/** Pide permiso para las cinco métricas y devuelve el estado resultante. */
export async function conectar(): Promise<EstadoSalud> {
  try {
    if (Platform.OS === 'android' && healthConnect) {
      const hc = healthConnect;
      // El diálogo nativo CRASHEA el proceso en binarios sin el permission
      // delegate: ahí ni se intenta, la UI manda a los ajustes.
      if (!binarioConDelegate()) {
        await AsyncStorage.setItem(K_PEDIDO, '1').catch(() => {});
        return leerEstado();
      }
      // El tipo de requestPermission es una unión de cuatro formas de permiso
      // (lectura, ruta de ejercicio, acceso en segundo plano, historial). Un
      // recordType que sale de una tabla es `string` para TypeScript, así que
      // la unión no resuelve elemento por elemento: se afirma el arreglo
      // completo una vez. El test que cruza el core contra app.json es lo que
      // de verdad protege estos nombres, no el compilador.
      const permisos = DEFINICIONES.map((d) => ({
        accessType: 'read' as const,
        recordType: d.android,
      })) as unknown as Parameters<typeof hc.requestPermission>[0];
      await conLimite(
        (async () => {
          await hc.initialize();
          await hc.requestPermission(permisos);
        })(),
        undefined,
        // El usuario decide a su ritmo: el diálogo del sistema no lleva prisa.
        120000,
      );
    } else if (Platform.OS === 'ios' && healthKit) {
      const hk = healthKit;
      await conLimite(
        hk.requestAuthorization({
          toRead: [
            'HKQuantityTypeIdentifierStepCount',
            'HKCategoryTypeIdentifierSleepAnalysis',
            'HKQuantityTypeIdentifierRestingHeartRate',
            'HKQuantityTypeIdentifierBodyMass',
            'HKQuantityTypeIdentifierActiveEnergyBurned',
          ],
        }),
        false,
        120000,
      );
    }
  } catch (e) {
    logWarn('[health-platform] conectar:', e);
  }
  // Se marca SIEMPRE que ya preguntamos: es lo que después permite no
  // confundir "todavía no pregunto" con "me dijo que no".
  await AsyncStorage.setItem(K_PEDIDO, '1').catch(() => {});
  return leerEstado();
}

/**
 * Desconectar es apagar la lectura DEL LADO DE ATP: dejamos de leer y dejamos
 * de sincronizar. Ninguna de las dos plataformas permite que una app se revoque
 * a sí misma el permiso, así que no lo prometemos: la pantalla ofrece además
 * el atajo a los ajustes del sistema, que es donde eso sí se puede.
 */
export async function desconectar(): Promise<void> {
  await AsyncStorage.multiRemove([K_PEDIDO, K_SYNC, K_ULTIMO]).catch(() => {});
}

/** Ajustes de la plataforma de salud, que es donde se conceden o revocan. */
export async function abrirAjustesPlataforma(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      healthConnect?.openHealthConnectSettings();
      return;
    }
    // En iOS los permisos de Salud viven en la app Salud, no en los ajustes
    // de ATP. Si el esquema no abre, caemos a los ajustes de la app.
    await Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  } catch (e) {
    logWarn('[health-platform] abrir ajustes:', e);
  }
}

// ── Lectura ──

function inicioDelDiaLocal(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

function finDelDiaLocal(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 23, 59, 59, 999);
}

async function leerAndroid(fechas: string[]): Promise<Map<string, DiaSalud>> {
  const mapa = new Map(fechas.map((f) => [f, diaVacio(f)]));
  if (!healthConnect || fechas.length === 0) return mapa;
  const hc = healthConnect;

  const filtro = {
    operator: 'between' as const,
    startTime: inicioDelDiaLocal(fechas[0]).toISOString(),
    endTime: finDelDiaLocal(fechas[fechas.length - 1]).toISOString(),
  };
  // Un día por rebanada: una llamada por métrica en vez de una por día.
  const rebanada = { period: 'DAYS' as const, length: 1 };

  const ponEnSuDia = (startTime: string, aplica: (dia: DiaSalud) => void) => {
    const fecha = toLocalDateString(new Date(startTime));
    const dia = mapa.get(fecha);
    if (dia) aplica(dia);
  };

  await conLimite(
    (async () => {
      await hc.initialize();

      const pasos = await hc
        .aggregateGroupByPeriod({ recordType: 'Steps', timeRangeFilter: filtro, timeRangeSlicer: rebanada })
        .catch(() => []);
      for (const g of pasos) {
        ponEnSuDia(g.startTime, (dia) => { dia.pasos = sanear('pasos', g.result.COUNT_TOTAL); });
      }

      const energia = await hc
        .aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: filtro, timeRangeSlicer: rebanada })
        .catch(() => []);
      for (const g of energia) {
        ponEnSuDia(g.startTime, (dia) => {
          dia.energia_activa = sanear('energia_activa', g.result.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? null);
        });
      }

      const fc = await hc
        .aggregateGroupByPeriod({ recordType: 'RestingHeartRate', timeRangeFilter: filtro, timeRangeSlicer: rebanada })
        .catch(() => []);
      for (const g of fc) {
        ponEnSuDia(g.startTime, (dia) => { dia.fc_reposo = sanear('fc_reposo', g.result.BPM_AVG); });
      }

      const peso = await hc
        .aggregateGroupByPeriod({ recordType: 'Weight', timeRangeFilter: filtro, timeRangeSlicer: rebanada })
        .catch(() => []);
      for (const g of peso) {
        ponEnSuDia(g.startTime, (dia) => {
          dia.peso = sanear('peso', aKilogramos(g.result.WEIGHT_AVG?.inKilograms ?? null, 'kg'));
        });
      }
    })(),
    undefined,
    20000,
  );

  return mapa;
}

async function leerIOS(fechas: string[]): Promise<Map<string, DiaSalud>> {
  const mapa = new Map(fechas.map((f) => [f, diaVacio(f)]));
  if (!healthKit || fechas.length === 0) return mapa;
  const hk = healthKit;

  const startDate = inicioDelDiaLocal(fechas[0]);
  const endDate = finDelDiaLocal(fechas[fechas.length - 1]);
  const opciones = { filter: { date: { startDate, endDate } } };
  const porDia = { day: 1 };

  const ponEnSuDia = (inicio: Date | undefined, aplica: (dia: DiaSalud) => void) => {
    if (!inicio) return;
    const dia = mapa.get(toLocalDateString(inicio));
    if (dia) aplica(dia);
  };

  await conLimite(
    (async () => {
      const pasos = await hk
        .queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], startDate, porDia, opciones)
        .catch(() => []);
      for (const r of pasos) {
        ponEnSuDia(r.startDate, (dia) => { dia.pasos = sanear('pasos', r.sumQuantity?.quantity ?? null); });
      }

      const energia = await hk
        .queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], startDate, porDia, opciones)
        .catch(() => []);
      for (const r of energia) {
        ponEnSuDia(r.startDate, (dia) => {
          // La unidad la decide la preferencia del usuario, no nosotros.
          dia.energia_activa = sanear(
            'energia_activa',
            aKilocalorias(r.sumQuantity?.quantity ?? null, r.sumQuantity?.unit ?? 'kcal'),
          );
        });
      }

      const fc = await hk
        .queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierRestingHeartRate', ['discreteAverage'], startDate, porDia, opciones)
        .catch(() => []);
      for (const r of fc) {
        ponEnSuDia(r.startDate, (dia) => { dia.fc_reposo = sanear('fc_reposo', r.averageQuantity?.quantity ?? null); });
      }

      const peso = await hk
        .queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierBodyMass', ['discreteAverage'], startDate, porDia, opciones)
        .catch(() => []);
      for (const r of peso) {
        ponEnSuDia(r.startDate, (dia) => {
          dia.peso = sanear('peso', aKilogramos(r.averageQuantity?.quantity ?? null, r.averageQuantity?.unit ?? 'kg'));
        });
      }
    })(),
    undefined,
    20000,
  );

  return mapa;
}

/**
 * Los últimos `diasAtras` días de salud del sistema, ya normalizados.
 * El SUEÑO no se recalcula aquí: se reúsa el import que ya resuelve a qué
 * noche pertenece cada tramo (una noche partida en segmentos, siestas que no
 * son "la noche"). Una sola verdad para el sueño en toda la app.
 */
export async function leerDias(diasAtras = 7): Promise<DiaSalud[]> {
  const fechas = ventanaDeFechas(new Date(), diasAtras, toLocalDateString);
  const mapa =
    Platform.OS === 'android' ? await leerAndroid(fechas)
    : Platform.OS === 'ios' ? await leerIOS(fechas)
    : new Map(fechas.map((f) => [f, diaVacio(f)]));

  const noches = await conLimite(leerNochesDeSalud(diasAtras), [], 20000);
  for (const n of noches) {
    const dia = mapa.get(n.nightDate);
    if (dia) dia.sueno = sanear('sueno', n.durationMinutes);
  }

  return fechas.map((f) => mapa.get(f) ?? diaVacio(f));
}

// ── Sincronización a Supabase ──

export interface ResultadoSync {
  ok: boolean;
  diasEscritos: number;
  metricas: MetricaSalud[];
  error?: string;
}

/**
 * Guarda lo leído en health_os_daily. Tabla propia a propósito: lo que mide
 * una máquina NO pisa lo que escribió la persona en health_measurements.
 * Si alguien anotó su peso a mano y la báscula del reloj dice otra cosa, gana
 * la persona, y las dos versiones siguen existiendo.
 */
export async function sincronizar(userId: string, diasAtras = 7): Promise<ResultadoSync> {
  try {
    const estado = await leerEstado();
    if (estado.estado !== 'conectado') {
      return { ok: false, diasEscritos: 0, metricas: [], error: estado.mensaje };
    }
    const dias = diasConDatos(await leerDias(diasAtras));
    if (dias.length === 0) {
      await AsyncStorage.setItem(K_ULTIMO, new Date().toISOString()).catch(() => {});
      return { ok: true, diasEscritos: 0, metricas: [] };
    }
    const filas = dias.map((d) => ({
      user_id: userId,
      date: d.fecha,
      steps: d.pasos,
      sleep_minutes: d.sueno,
      resting_hr: d.fc_reposo,
      weight_kg: d.peso,
      active_kcal: d.energia_activa,
      source: Platform.OS === 'ios' ? 'healthkit' : 'health_connect',
      synced_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('health_os_daily')
      .upsert(filas, { onConflict: 'user_id,date' });
    if (error) throw new Error(error.message);

    await AsyncStorage.setItem(K_ULTIMO, new Date().toISOString()).catch(() => {});
    const metricas = METRICAS.filter((m) => dias.some((d) => d[m] != null));
    return { ok: true, diasEscritos: dias.length, metricas };
  } catch (e) {
    logWarn('[health-platform] sincronizar:', e);
    return {
      ok: false,
      diasEscritos: 0,
      metricas: [],
      error: 'No se pudo guardar lo que leímos. Intenta de nuevo.',
    };
  }
}

// ── Sync automática (opt-in explícito, nunca por default) ──

export async function getSyncAutomatica(): Promise<boolean> {
  return leerBandera(K_SYNC);
}

export async function setSyncAutomatica(v: boolean): Promise<void> {
  await AsyncStorage.setItem(K_SYNC, v ? '1' : '0').catch(() => {});
}

export async function getUltimoSync(): Promise<string | null> {
  return AsyncStorage.getItem(K_ULTIMO).catch(() => null);
}

/** Sync silencioso: solo corre si la persona lo activó, y solo una vez al día. */
export async function syncAutomaticaSiAplica(userId: string): Promise<number> {
  if (!(await getSyncAutomatica())) return 0;
  const ultimo = await getUltimoSync();
  if (ultimo && toLocalDateString(new Date(ultimo)) === getLocalToday()) return 0;
  const res = await sincronizar(userId, 3);
  return res.ok ? res.diasEscritos : 0;
}
