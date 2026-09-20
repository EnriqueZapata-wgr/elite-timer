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
 * Quién manda: el import NUNCA pisa una noche de la sesión propia (source
 * sleep_cycle). Las noches nuevas entran con ignoreDuplicates (ON CONFLICT DO
 * NOTHING); una noche que el propio import dejó a medias (fila de máquina más
 * corta) sí se completa con la lectura más larga (A5, decidirEscrituras). La
 * sesión propia del Sleep Cycle sí pisa (ver sleep-session-service). Una
 * noche, un registro, una sola verdad.
 *
 * ⚠️ Lección MB-27: el CHECK de source de sleep_nights (261) nace con
 * 'health_connect' y 'healthkit' desde el día uno, y el cruce vive en
 * sleep-source-contract.test.ts.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { conLimite, decidirEscrituras, type FilaExistente } from './sueno-unificado-core';

// ── Anti-cuelgue (20-sep-2026) ──
//
// Antes ninguna de estas llamadas tenía límite de tiempo: si Health Connect no
// contestaba (la app del sistema a medio actualizar), el botón IMPORTAR se
// quedaba en "..." para siempre. Cada llamada nativa cae por tiempo y el
// respaldo es null, nunca [] ni false, para que "no contestó" no se lea como
// "no hay nada" ni como "dijo que no".
const LIMITE_PLATAFORMA_MS = 8000;
/** El diálogo del sistema no lleva prisa: el usuario decide a su ritmo. */
const LIMITE_DIALOGO_MS = 120000;
const LIMITE_LECTURA_MS = 20000;
const avisar = (motivo: 'tiempo' | 'error', detalle?: unknown) =>
  logWarn('[sleep-import] la plataforma no contestó:', motivo, detalle ?? '');

/**
 * iOS no dice qué concedió de lectura (Apple lo esconde a propósito). Lo
 * único honesto es recordar que ATP ya pidió el permiso de sueño: con esa
 * evidencia la lectura silenciosa se intenta (leer sin permiso no abre ningún
 * diálogo y devuelve vacío); sin ella, no.
 */
const K_SUENO_PEDIDO_IOS = 'sleep_permiso_pedido_ios_v1';

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

/**
 * Forma común de los cuatro tipos de permiso que Health Connect devuelve
 * (lectura, ruta de ejercicio, segundo plano, historial): getGrantedPermissions
 * y requestPermission devuelven uniones distintas, y aquí solo importa el par.
 */
interface PermisoHC {
  accessType: string;
  recordType: string;
}

/** ¿Esta lista de permisos incluye LEER sueño? (lo que pedimos, no cualquier otro). */
function incluyeLecturaSueno(perms: readonly PermisoHC[]): boolean {
  return perms.some((p) => p.recordType === 'SleepSession' && p.accessType === 'read');
}

/** ¿La lectura de sueño ya está concedida en Health Connect? (sin diálogos). */
async function lecturaSuenoConcedidaAndroid(): Promise<boolean> {
  if (!healthConnect) return false;
  return incluyeLecturaSueno(await healthConnect.getGrantedPermissions());
}

export type ResultadoPermisosSueno =
  | 'ok'
  | 'denegado'
  | 'dialogo_no_disponible' // binario sin delegate: abrir el diálogo crashea nativo
  | 'no_contesto'; // la plataforma no respondió a tiempo: no es un "no"

export async function solicitarPermisosSueno(): Promise<ResultadoPermisosSueno> {
  // A2 (20-sep-2026): pedir el permiso es la acción explícita de "sí quiero
  // que ATP lea mi sueño". Si la persona había apagado la lectura desde
  // Ajustes › Salud del teléfono, esto la vuelve a encender; el resultado del
  // diálogo decide después si de verdad hay permiso.
  try {
    const plataforma = await import('@/src/services/health/health-platform-service');
    await plataforma.encenderLecturaSalud();
  } catch (e) {
    logWarn('[sleep-import] encender lectura:', e);
  }
  try {
    if (Platform.OS === 'android' && healthConnect) {
      const hc = healthConnect;
      const yaConcedido = await conLimite<boolean | null>(
        (async () => {
          await hc.initialize();
          return lecturaSuenoConcedidaAndroid();
        })(),
        null,
        LIMITE_PLATAFORMA_MS,
        avisar,
      );
      if (yaConcedido === null) return 'no_contesto';
      if (yaConcedido) return 'ok';
      if (!binarioConDelegate()) return 'dialogo_no_disponible';
      const granted = await conLimite<readonly PermisoHC[] | null>(
        hc.requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]),
        null,
        LIMITE_DIALOGO_MS,
        avisar,
      );
      if (granted === null) return 'no_contesto';
      // 20-sep-2026: requestPermission devuelve TODO lo concedido a la app, no
      // solo lo pedido. Tener pasos concedidos no es tener sueño concedido.
      return incluyeLecturaSueno(granted) ? 'ok' : 'denegado';
    }
    if (Platform.OS === 'ios' && healthKit) {
      const ok = await conLimite<boolean | null>(
        healthKit.requestAuthorization({ toRead: ['HKCategoryTypeIdentifierSleepAnalysis'] }),
        null,
        LIMITE_DIALOGO_MS,
        avisar,
      );
      if (ok === null) return 'no_contesto';
      // Se marca que ya preguntamos (la única evidencia que iOS nos deja).
      await AsyncStorage.setItem(K_SUENO_PEDIDO_IOS, '1').catch(() => {});
      return ok ? 'ok' : 'denegado';
    }
  } catch (e) {
    logWarn('[sleep-import] permisos:', e);
  }
  return 'denegado';
}

/**
 * Lo que se sabe del permiso de sueño SIN abrir diálogos (A1, 20-sep-2026).
 * 'no_contesto' es la plataforma que no respondió a tiempo o reventó: NO es
 * un "no". Antes salía como false y la pantalla decía "ATP todavía no tiene
 * permiso" por un timeout de Health Connect.
 */
export type PermisoSuenoLeido = 'si' | 'no' | 'no_contesto';

/** Re-check tras conceder desde los ajustes de Health Connect (sin diálogos). */
export async function permisosSuenoYaConcedidos(): Promise<PermisoSuenoLeido> {
  try {
    if (Platform.OS === 'android' && healthConnect) {
      const hc = healthConnect;
      const r = await conLimite<boolean | null>(
        (async () => {
          await hc.initialize();
          return lecturaSuenoConcedidaAndroid();
        })(),
        null,
        LIMITE_PLATAFORMA_MS,
        avisar,
      );
      if (r === null) return 'no_contesto';
      return r ? 'si' : 'no';
    }
    if (Platform.OS === 'android') return 'no';
  } catch (e) {
    logWarn('[sleep-import] re-check permisos:', e);
    return 'no_contesto';
  }
  // iOS no dice qué concedió y web no tiene plataforma: no es un "no" del
  // usuario, es que no hay respuesta que leer.
  return 'no_contesto';
}

/**
 * ¿Se puede intentar leer sueño SIN abrir ningún diálogo? (20-sep-2026)
 *
 * Es la puerta del import silencioso al abrir la app: si la respuesta es no,
 * no se pide nada desde ahí. Android lo sabe de verdad (getGrantedPermissions).
 * iOS no lo dice: se intenta solo si ATP ya pidió el permiso alguna vez, desde
 * Sueño o desde Ajustes › Salud del teléfono; leer sin permiso no abre diálogo
 * y devuelve vacío, así que el peor caso es no importar nada.
 */
export async function lecturaSuenoSinDialogoPosible(): Promise<PermisoSuenoLeido> {
  try {
    if (Platform.OS === 'android') return await permisosSuenoYaConcedidos();
    if (Platform.OS === 'ios' && healthKit) {
      if ((await AsyncStorage.getItem(K_SUENO_PEDIDO_IOS).catch(() => null)) === '1') return 'si';
      // Import dinámico: health-platform-service importa este módulo, y un
      // import estático de ida y vuelta se evalúa a medias.
      const plataforma = await import('@/src/services/health/health-platform-service');
      return (await plataforma.yaSePidioPermiso()) ? 'si' : 'no';
    }
  } catch (e) {
    logWarn('[sleep-import] lectura sin diálogo:', e);
    // Un error al consultar no es un "no": el llamador lo trata como fallo.
    return 'no_contesto';
  }
  return 'no';
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

/**
 * Resultado de leer la plataforma: `ok:false` es "no pude leer" (sin módulo,
 * sin respuesta, error nativo) y NUNCA se confunde con "no hay noches", que
 * es `ok:true` con lista vacía. Antes las dos salían como [] y la pantalla
 * le decía al cliente "no tienes noches" cuando en realidad no pudo leer.
 */
export type ResultadoLecturaSueno = { ok: true; noches: NocheImportada[] } | { ok: false };

/** Noches dormidas según la plataforma de salud, últimos `diasAtras` días, honesto. */
export async function leerNochesDeSaludResultado(diasAtras = 14): Promise<ResultadoLecturaSueno> {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasAtras);
  try {
    if (Platform.OS === 'android') {
      if (!healthConnect) return { ok: false };
      const tramos = await conLimite<TramoSueno[] | null>(
        leerTramosAndroid(desde.toISOString(), new Date().toISOString()),
        null,
        LIMITE_LECTURA_MS,
        avisar,
      );
      if (tramos === null) return { ok: false };
      return { ok: true, noches: nochesDesdeTramos(tramos, 'health_connect', toLocalDateString) };
    }
    if (Platform.OS === 'ios') {
      if (!healthKit) return { ok: false };
      const tramos = await conLimite<TramoSueno[] | null>(leerTramosIOS(desde), null, LIMITE_LECTURA_MS, avisar);
      if (tramos === null) return { ok: false };
      return { ok: true, noches: nochesDesdeTramos(tramos, 'healthkit', toLocalDateString) };
    }
  } catch (e) {
    logWarn('[sleep-import] lectura:', e);
  }
  return { ok: false };
}

/**
 * Noches dormidas según la plataforma de salud, últimos `diasAtras` días.
 * Versión que aplana el fallo a []: la conserva health-platform-service para
 * rellenar health_os_daily, donde una noche que no se pudo leer simplemente
 * no se escribe. Quien necesite distinguir fallo de vacío usa la de arriba.
 */
export async function leerNochesDeSalud(diasAtras = 14): Promise<NocheImportada[]> {
  const r = await leerNochesDeSaludResultado(diasAtras);
  return r.ok ? r.noches : [];
}

// ── Import a sleep_nights (el import NUNCA pisa la sesión propia) ──

export interface ImportSuenoResult {
  ok: boolean;
  /**
   * Noches que cambiaron en sleep_nights: las nuevas MÁS las de máquina que
   * se completaron con una lectura más larga (A5). Una noche de la sesión
   * propia nunca cuenta aquí porque nunca se toca.
   */
  importadas: number;
  /** De `importadas`, cuántas fueron una noche parcial que se completó. */
  actualizadas?: number;
  error?: string;
}

/** Solo estas filas puede actualizar el import; la base lo vuelve a filtrar. */
const FUENTES_DE_MAQUINA = ['health_connect', 'healthkit'] as const;

/**
 * A5 (20-sep-2026): antes era un solo upsert con ON CONFLICT DO NOTHING, y
 * una noche leída a medias (la persona despertó a las 5:30, miró el teléfono
 * y siguió durmiendo) quedaba congelada: la noche completa nunca la
 * reemplazaba. Ahora se leen las filas de esas fechas y decide
 * decidirEscrituras (puro, con test):
 *   · sin fila: upsert con ignoreDuplicates (sigue siendo DO NOTHING ante
 *     una carrera con la sesión propia);
 *   · fila de máquina más corta: UPDATE de esa sola fila, filtrado además en
 *     la base por source de máquina, para que ni una carrera con la sesión
 *     propia la pise;
 *   · fila sleep_cycle: no se toca. Nunca.
 * Si la lectura previa falla, se cae al camino viejo (solo inserta): degradar
 * a "no pisar nada" es lo seguro.
 */
export async function importarNoches(
  userId: string,
  noches: NocheImportada[],
): Promise<ImportSuenoResult> {
  try {
    if (noches.length === 0) return { ok: true, importadas: 0, actualizadas: 0 };

    let existentes: FilaExistente[] = [];
    const lectura = await supabase
      .from('sleep_nights')
      .select('night_date, source, duration_minutes')
      .eq('user_id', userId)
      .in('night_date', noches.map((n) => n.nightDate));
    if (lectura.error) {
      logWarn('[sleep-import] no se pudieron leer las noches existentes; solo se insertará', lectura.error.message);
    } else {
      existentes = (lectura.data ?? []) as FilaExistente[];
    }
    const decision = decidirEscrituras(existentes, noches);
    const aFila = (n: NocheImportada) => ({
      user_id: userId,
      night_date: n.nightDate,
      bed_time: n.bedTimeISO,
      wake_time: n.wakeTimeISO,
      duration_minutes: n.durationMinutes,
      score: null,
      snore_minutes: null,
      source: n.source,
      external_id: n.externalId,
    });

    let insertadas = 0;
    if (decision.insertar.length > 0) {
      // UNA NOCHE, UN REGISTRO: ignoreDuplicates = ON CONFLICT DO NOTHING.
      // Si esa noche apareció entre la lectura y aquí, se respeta.
      const { data, error } = await supabase
        .from('sleep_nights')
        .upsert(decision.insertar.map(aFila), { onConflict: 'user_id,night_date', ignoreDuplicates: true })
        .select('night_date');
      if (error) throw new Error(error.message);
      insertadas = (data ?? []).length;
    }

    let actualizadas = 0;
    for (const n of decision.actualizar) {
      const fila = aFila(n);
      const { data, error } = await supabase
        .from('sleep_nights')
        .update({
          bed_time: fila.bed_time,
          wake_time: fila.wake_time,
          duration_minutes: fila.duration_minutes,
          source: fila.source,
          external_id: fila.external_id,
        })
        .eq('user_id', userId)
        .eq('night_date', n.nightDate)
        .in('source', [...FUENTES_DE_MAQUINA])
        .select('night_date');
      if (error) throw new Error(error.message);
      actualizadas += (data ?? []).length;
    }

    return { ok: true, importadas: insertadas + actualizadas, actualizadas };
  } catch (e) {
    logWarn('[sleep-import] importar:', e);
    return {
      ok: false,
      importadas: 0,
      error: e instanceof Error ? e.message : 'No se pudo importar.',
    };
  }
}
