/**
 * Sueño unificado service (20-sep-2026) — UNA sola lectura del descanso, y el
 * import silencioso al abrir la app.
 *
 * EL DEFECTO QUE REPARA: dos silos que nadie cruzaba. IMPORTAR en /sleep
 * escribía sleep_nights; "Sincronizar" en Ajustes › Salud del teléfono y la
 * sync automática escribían health_os_daily.sleep_minutes; /sleep y ARGOS
 * leían solo sleep_nights. El cliente conectaba su teléfono, abría Sueño y
 * veía "Aún no vemos tu descanso". Desde hoy todo el que quiera noches pasa
 * por leerNochesUnificadas (la pantalla de Sueño, ARGOS) y la regla de unión
 * vive en un solo lugar (sueno-unificado-core, puro y con test).
 *
 * "NO PUDE LEER" Y "NO HAY DATOS" SON DISTINTOS, SIEMPRE: la lectura devuelve
 * { ok: false, motivo } cuando sleep_nights (la tabla que manda) no contestó
 * o no hay sesión, y { ok: true, noches: [] } cuando de verdad no hay nada.
 * Si solo falla health_os_daily, se degrada por tabla (A4): salen las noches
 * guardadas con `parcial: 'telefono'` y la pantalla lo dice. Un hueco
 * presentado como cero hace que alguien decida mal con toda confianza.
 *
 * EL IMPORT SILENCIOSO (reconciliarSuenoSilencioso) sigue el patrón de
 * pack-avisos-service: guard contra corrida doble, respiro POR CUENTA (A3)
 * para no pegarle a la plataforma ni a la base en cada cambio de pestaña, y
 * NUNCA abre un diálogo de permiso: si no está concedido, se sale en
 * silencio. Si la persona apagó la lectura desde Ajustes (A2), se sale antes
 * de tocar la plataforma. Escribe por importarNoches: nunca pisa la sesión
 * propia; solo completa una noche de máquina que quedó a medias (A5).
 *
 * Los módulos con `require` de nativos (health-platform-service,
 * sleep-import-service, health-import-service) se importan de forma
 * dinámica, solo cuando de verdad hace falta leer la plataforma, para no
 * meter esa evaluación en el arranque de HOY (mismo motivo que
 * health-read-service).
 */
import { DeviceEventEmitter } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { decidirCorrida } from '@/src/services/pack-avisos-reconcile-core';
import { invalidarSaludDelDia } from '@/src/hooks/useWearableToday';
// Solo el tipo: el módulo real se importa dinámico más abajo.
import type { HealthPlatform } from '@/src/services/fitness/health-import-service';
import {
  conLimite,
  fechaDesde,
  respiroDe,
  unirNoches,
  type FilaSleepNight,
  type FilaSuenoTelefono,
  type Noche,
  type RespiroUsuario,
} from './sueno-unificado-core';

export { etiquetaFuenteNoche } from './sueno-unificado-core';
export type { FuenteNoche, Noche } from './sueno-unificado-core';

// ── Lectura unificada ──

export type ResultadoNochesUnificadas =
  | {
      ok: true;
      noches: Noche[];
      /**
       * A4: sleep_nights contestó pero health_os_daily no. Las noches son
       * las guardadas; las que solo vivían en la sync del teléfono faltan, y
       * la pantalla lo dice. Ausente = las dos tablas contestaron.
       */
      parcial?: 'telefono';
    }
  | { ok: false; motivo: 'sin_usuario' | 'lectura' };

/**
 * Las últimas `dias` noches del usuario, unidas de sleep_nights y
 * health_os_daily, la más reciente primero y sin fechas repetidas (misma
 * fecha: manda sleep_nights; solo teléfono: fuente 'telefono').
 *
 * { ok: false, motivo: 'lectura' } = sleep_nights no se pudo leer;
 * { ok: false, motivo: 'sin_usuario' } = no hay sesión. Ninguna es "no hay
 * noches": eso es { ok: true, noches: [] }. Si solo falla health_os_daily,
 * es { ok: true, noches, parcial: 'telefono' } (A4).
 */
export async function leerNochesUnificadas(
  userId: string,
  dias = 14,
): Promise<ResultadoNochesUnificadas> {
  if (!userId) return { ok: false, motivo: 'sin_usuario' };
  try {
    const desde = fechaDesde(parseLocalDate(getLocalToday()), dias, toLocalDateString);
    const [nochesRes, telefonoRes] = await Promise.all([
      supabase
        .from('sleep_nights')
        .select('night_date, bed_time, wake_time, duration_minutes, score, snore_minutes, source')
        .eq('user_id', userId)
        .gte('night_date', desde)
        .order('night_date', { ascending: false }),
      supabase
        .from('health_os_daily')
        .select('date, sleep_minutes')
        .eq('user_id', userId)
        .gte('date', desde)
        .order('date', { ascending: false }),
    ]);
    // supabase-js no lanza en 4xx: una tabla que no contesta llega como
    // {error}. La tabla que manda es sleep_nights: sin ella no hay lectura.
    if (nochesRes.error) {
      logWarn('[sueno-unificado] lectura fallida (sleep_nights)', nochesRes.error.message);
      return { ok: false, motivo: 'lectura' };
    }
    const filasNoches = (nochesRes.data ?? []) as FilaSleepNight[];
    // A4: si solo falla la sync del teléfono, se devuelven las noches
    // guardadas y se marca parcial; esconderlas por la otra tabla era peor.
    if (telefonoRes.error) {
      logWarn('[sueno-unificado] lectura parcial (health_os_daily)', telefonoRes.error.message);
      return { ok: true, noches: unirNoches(filasNoches, []), parcial: 'telefono' };
    }
    return {
      ok: true,
      noches: unirNoches(filasNoches, (telefonoRes.data ?? []) as FilaSuenoTelefono[]),
    };
  } catch (e) {
    logWarn('[sueno-unificado] lectura fallida', e);
    return { ok: false, motivo: 'lectura' };
  }
}

// ── Import silencioso al abrir la app ──

export type MotivoSuenoSilencioso =
  /** Guard o respiro: ya corrió hace poco o está corriendo (por cuenta). */
  | 'muy_pronto'
  | 'sin_usuario'
  /** La persona apagó la lectura desde Ajustes › Salud del teléfono (A2). */
  | 'apagado_por_usuario'
  /** Binario sin módulo, Health Connect sin instalar, web, o no contestó. */
  | 'sin_plataforma'
  /** No hay permiso de lectura de sueño: no se pide desde aquí. */
  | 'sin_permiso'
  /**
   * La plataforma no se pudo leer, o no contestó al preguntar por el permiso
   * (no es "no hay noches" ni "sin permiso").
   */
  | 'lectura_fallida'
  /** Se leyó bien pero sleep_nights no se pudo escribir. */
  | 'escritura_fallida'
  /** Se leyó bien y no había nada nuevo que escribir. */
  | 'nada_nuevo'
  | 'importadas';

export interface ResultadoSuenoSilencioso {
  motivo: MotivoSuenoSilencioso;
  /** Noches que cambiaron en sleep_nights: nuevas más parciales completadas (A5). */
  importadas: number;
}

/** Cuántos días hacia atrás se leen en silencio (mismos que el botón IMPORTAR). */
const DIAS_SILENCIOSO = 14;
/** Respiro entre corridas: el sueño cambia una vez al día, no cada pestaña. */
const RESPIRO_MS = 2 * 60 * 60 * 1000;
const LIMITE_PLATAFORMA_MS = 8000;

// HOY llama a esto al montar, al volver del segundo plano y al recuperar
// foco, y esos pueden llegar juntos. El guard evita la corrida doble.
// A3: por cuenta. Con variables de módulo, cambiar de usuario dentro de las
// dos horas devolvía 'muy_pronto' a la cuenta nueva.
const respiros = new Map<string, RespiroUsuario>();

const avisar = (motivo: 'tiempo' | 'error', detalle?: unknown) =>
  logWarn('[sueno-unificado] la plataforma no contestó:', motivo, detalle ?? '');

/**
 * Importa en silencio las noches nuevas que el teléfono ya midió, si y solo
 * si la lectura de sueño ya está concedida y la persona no la apagó.
 * Idempotente: correrlo diez veces deja el mismo resultado que una (una
 * noche solo cambia si la lectura trae más minutos que la fila de máquina).
 *
 * Las salidas por apagado, plataforma o permiso NO marcan el respiro, a
 * propósito: el caso que importa es conceder el permiso en Ajustes › Salud
 * del teléfono y volver a HOY en diez segundos. Tampoco lo marca un permiso
 * que no contestó (A1): un timeout no es un "no". Una lectura (buena o
 * fallida) sí lo marca: una plataforma rota no se arregla en un cambio de
 * pestaña.
 *
 * Con `forzar` se salta el respiro (la pantalla de Sueño lo usa al entrar).
 */
export async function reconciliarSuenoSilencioso(
  userId: string,
  opts?: { forzar?: boolean },
): Promise<ResultadoSuenoSilencioso> {
  if (!userId) return { motivo: 'sin_usuario', importadas: 0 };
  const ahora = Date.now();
  const respiro = respiroDe(respiros, userId);
  const decision = decidirCorrida({
    corriendo: respiro.corriendo,
    ultimaCorridaMs: respiro.ultimaCorridaMs,
    ahoraMs: ahora,
    respiroMs: RESPIRO_MS,
    forzar: opts?.forzar,
  });
  if (decision !== 'corre') return { motivo: 'muy_pronto', importadas: 0 };
  respiros.set(userId, { corriendo: true, ultimaCorridaMs: respiro.ultimaCorridaMs });
  const marcarCorrida = () => respiros.set(userId, { corriendo: true, ultimaCorridaMs: ahora });
  try {
    // A2: la persona apagó la lectura desde Ajustes. Se sale ANTES de tocar
    // la plataforma y sin marcar respiro: al volver a conectar corre de una.
    const plataformaSvc = await import('@/src/services/health/health-platform-service');
    if (await plataformaSvc.lecturaSaludApagadaPorUsuario()) {
      return { motivo: 'apagado_por_usuario', importadas: 0 };
    }

    const fitness = await import('@/src/services/fitness/health-import-service');
    const plataforma = await conLimite<HealthPlatform | null>(
      fitness.getHealthPlatform(),
      null,
      LIMITE_PLATAFORMA_MS,
      avisar,
    );
    if (!plataforma || plataforma.status !== 'disponible') {
      return { motivo: 'sin_plataforma', importadas: 0 };
    }

    const sleepImport = await import('./sleep-import-service');
    // LEE el permiso, no lo pide. Sin él, salida silenciosa. A1: si la
    // plataforma no contestó, es un fallo de lectura, no un "no"; y no se
    // marca respiro para reintentar en el siguiente foco.
    const permiso = await sleepImport.lecturaSuenoSinDialogoPosible();
    if (permiso === 'no_contesto') return { motivo: 'lectura_fallida', importadas: 0 };
    if (permiso !== 'si') return { motivo: 'sin_permiso', importadas: 0 };

    const lectura = await sleepImport.leerNochesDeSaludResultado(DIAS_SILENCIOSO);
    marcarCorrida();
    if (!lectura.ok) return { motivo: 'lectura_fallida', importadas: 0 };
    if (lectura.noches.length === 0) return { motivo: 'nada_nuevo', importadas: 0 };

    const escrito = await sleepImport.importarNoches(userId, lectura.noches);
    if (!escrito.ok) return { motivo: 'escritura_fallida', importadas: 0 };
    if (escrito.importadas > 0) {
      // Cerrar el lazo (lección CIERRE-3): sin esto la noche entra a la base
      // y HOY sigue mostrando el vuelo cacheado de hace un rato.
      invalidarSaludDelDia();
      DeviceEventEmitter.emit('day_changed');
      return { motivo: 'importadas', importadas: escrito.importadas };
    }
    return { motivo: 'nada_nuevo', importadas: 0 };
  } catch (e) {
    logWarn('[sueno-unificado] reconciliación fallida', e);
    marcarCorrida();
    return { motivo: 'lectura_fallida', importadas: 0 };
  } finally {
    const r = respiros.get(userId);
    respiros.set(userId, { corriendo: false, ultimaCorridaMs: r?.ultimaCorridaMs ?? 0 });
  }
}
