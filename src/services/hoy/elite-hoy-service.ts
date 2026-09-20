/**
 * HOY para un cliente Elite (20-sep-2026): el IO. La regla vive en
 * elite-hoy-core.ts con test; aqui solo se junta la materia prima.
 *
 * CONTRATO para otros bloques: `leerEvaluacionEliteVigente(userId)` devuelve
 * `{ ok: true, evaluacion: EliteV3 | null } | { ok: false }` (fail-soft):
 * `evaluacion: null` es "Enrique todavia no la carga" y `ok: false` es "no
 * se pudo leer" (red, RLS) o "hay una fila y no valida" (`motivo`). Los dos
 * son estados distintos y se pintan distinto (regla 7 de la casa).
 *
 * No se duplica la lectura: usa `fetchEvaluacionesElite` de
 * src/services/elite (la misma que la pantalla Mi evaluacion Elite), que ya
 * ordena por version, valida contra el esquema y deja fuera el `html`. La
 * vigente es la primera.
 *
 * Una lectura compartida: el hero, la fila de puertas y la terna se montan a
 * la vez en cada entrada a HOY y las tres preguntan lo mismo. La promesa en
 * vuelo se comparte; un fallo no se cachea (el reintento tiene que ir a la
 * base). `forzar` salta todo.
 *
 * 20-sep-2026 (ronda de arreglos, A5): el resultado bueno vive 60 s y, al
 * vencer, NO se relee el JSON: se verifica `version, created_at` (una
 * lectura ligera, como argos-elite-contexto-service) y solo si cambio se
 * vuelve a leer la fila completa (y solo la vigente: `soloVigente`, limit 1;
 * antes eran las secciones de hasta 20 versiones cada 3 s). Si la
 * verificacion falla y hay resultado bueno, se sirve ese con aviso: la
 * evaluacion de hace un minuto sigue siendo verdad, y las otras lecturas
 * de HOY (labs, habitos) ya dicen "no se pudo leer" por su cuenta.
 *
 * (A2) Cuando lo entregado cambia (aparecio, cambio de version, o volvio a
 * leerse bien tras un fallo) se emite EVALUACION_ELITE_CHANGED_EVENT para
 * que las puertas y la terna releean; antes Reintentar/Actualizar del hero
 * solo refrescaba al hero.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { fetchEvaluacionesElite } from '@/src/services/elite/evaluacion-elite-service';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  cambioVersionElite, objetivoActivo, suplementosDeHoy,
  type FilaPackHoy, type FilaSuplementoHoy, type LogSuplementoHoy, type ObjetivoHoy, type SuplementoHoy,
  type VersionVistaElite,
} from './elite-hoy-core';

export type LecturaEvaluacionVigente =
  | { ok: true; evaluacion: EliteV3 | null }
  | { ok: false; motivo: 'lectura' | 'formato' };

/**
 * Evento de UI: la evaluacion vigente que HOY conoce cambio. Payload
 * `{ userId }`. Lo emite esta lectura compartida al resolver una lectura
 * completa cuya version es distinta de la ultima entregada, o que llega
 * despues de un fallo. NO se emite en la primera lectura de la sesion (los
 * tres consumidores comparten esa promesa) ni cuando un Actualizar
 * encuentra la misma version (no hay nada que refrescar).
 */
export const EVALUACION_ELITE_CHANGED_EVENT = 'evaluacion_elite_changed';

/** Cuanto vive un resultado bueno antes de verificar (ligero) si cambio la version. */
const TTL_MS = 60_000;

interface EntradaCache {
  promesa: Promise<LecturaEvaluacionVigente>;
  /** null mientras esta en vuelo; despues, cuando resolvio o se verifico por ultima vez. */
  resueltaEn: number | null;
  /** La fila que se leyo (null = no hay evaluacion), para la verificacion ligera. */
  version: VersionVistaElite | null;
  /** Verificacion ligera en vuelo (compartida entre quienes lleguen con el TTL vencido). */
  verificando: Promise<boolean> | null;
}

const cache = new Map<string, EntradaCache>();

/** Lo ultimo entregado por usuario: la version buena mas reciente y si hubo un fallo desde entonces. */
const ultimoEntregado = new Map<string, { version: VersionVistaElite | null; huboFallo: boolean }>();

/**
 * Para quien cargue o cambie la evaluacion desde la app, y para el cierre de
 * sesion (auth-context la llama sin userId): nada de una cuenta queda en
 * memoria para la siguiente.
 */
export function invalidarEvaluacionEliteHoy(userId?: string): void {
  if (userId) { cache.delete(userId); ultimoEntregado.delete(userId); }
  else { cache.clear(); ultimoEntregado.clear(); }
}

/** Lectura ligera: solo que version hay (sin el JSON). Lanza si falla. */
async function leerVersionVigente(userId: string): Promise<VersionVistaElite | null> {
  const { data, error } = await supabase
    .from('functional_dx')
    .select('version, created_at')
    .eq('user_id', userId)
    .not('sources_snapshot->elite_v3', 'is', null)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;
  const fila = Array.isArray(data) ? (data[0] as { version?: unknown; created_at?: unknown } | undefined) : undefined;
  if (!fila) return null;
  return {
    version: typeof fila.version === 'number' ? fila.version : null,
    created_at: typeof fila.created_at === 'string' ? fila.created_at : null,
  };
}

/** Anota lo entregado y avisa a la pantalla si es distinto de lo anterior (o si venimos de un fallo). */
function registrarEntrega(userId: string, r: LecturaEvaluacionVigente, version: VersionVistaElite | null): void {
  const previo = ultimoEntregado.get(userId);
  if (!r.ok) {
    ultimoEntregado.set(userId, { version: previo?.version ?? null, huboFallo: true });
    return;
  }
  const avisar = previo ? (previo.huboFallo || cambioVersionElite(previo.version, version)) : false;
  ultimoEntregado.set(userId, { version, huboFallo: false });
  if (avisar) DeviceEventEmitter.emit(EVALUACION_ELITE_CHANGED_EVENT, { userId });
}

/** La fila completa (solo la vigente). Deja la entrada en cache y avisa si cambio. */
function leerCompleta(userId: string): Promise<LecturaEvaluacionVigente> {
  const leida = (async (): Promise<{ r: LecturaEvaluacionVigente; version: VersionVistaElite | null }> => {
    const res = await fetchEvaluacionesElite(userId, { soloVigente: true });
    if (res.estado === 'error') return { r: { ok: false, motivo: 'lectura' }, version: null };
    const vigente = res.versiones[0];
    if (!vigente) return { r: { ok: true, evaluacion: null }, version: null };
    const version: VersionVistaElite = {
      version: Number.isFinite(vigente.version_dx) ? vigente.version_dx : null,
      created_at: vigente.created_at || null,
    };
    // Hay fila y no valida: existe, pero esta version de la app no la entiende.
    if (!vigente.evaluacion) return { r: { ok: false, motivo: 'formato' }, version };
    return { r: { ok: true, evaluacion: vigente.evaluacion }, version };
  })();
  const promesa = leida.then((x) => x.r);
  const entrada: EntradaCache = { promesa, resueltaEn: null, version: null, verificando: null };
  cache.set(userId, entrada);
  leida.then(({ r, version }) => {
    if (cache.get(userId) !== entrada) return;
    entrada.version = version;
    // resueltaEn ANTES de avisar: quien relea por el evento pega a la cache.
    if (r.ok) entrada.resueltaEn = Date.now();
    else cache.delete(userId);
    registrarEntrega(userId, r, version);
  }).catch(() => { if (cache.get(userId) === entrada) cache.delete(userId); });
  return promesa;
}

/**
 * true: la version no cambio (o no se pudo verificar y se sirve lo que hay);
 * false: cambio y hay que releer. Una sola verificacion en vuelo por entrada.
 */
function verificarVersion(userId: string, hit: EntradaCache): Promise<boolean> {
  if (!hit.verificando) {
    hit.verificando = (async () => {
      try {
        const actual = await leerVersionVigente(userId);
        if (cambioVersionElite(hit.version, actual)) return false;
        hit.resueltaEn = Date.now();
        return true;
      } catch (e) {
        // Hay resultado bueno de hace un rato: se sirve y se reintenta en la
        // siguiente entrada (resueltaEn no se mueve).
        logWarn(`[elite-hoy] no se pudo verificar la version; se usa lo leido: ${String(e)}`);
        return true;
      } finally {
        hit.verificando = null;
      }
    })();
  }
  return hit.verificando;
}

export async function leerEvaluacionEliteVigente(
  userId: string,
  opts?: { forzar?: boolean },
): Promise<LecturaEvaluacionVigente> {
  const hit = cache.get(userId);
  if (hit && !opts?.forzar) {
    if (hit.resueltaEn === null || Date.now() - hit.resueltaEn < TTL_MS) return hit.promesa;
    const sinCambio = await verificarVersion(userId, hit);
    // Mientras se verificaba pudo entrar un `forzar`: lo suyo es mas nuevo.
    const ahora = cache.get(userId);
    if (ahora && ahora !== hit) return ahora.promesa;
    if (sinCambio) return hit.promesa;
  }
  return leerCompleta(userId);
}

/**
 * Los suplementos del plan de Enrique con su estado de hoy. Rechaza si
 * cualquiera de las dos lecturas fallo: una terna sin la fila de tomas seria
 * decir en silencio que no hay plan.
 */
export async function leerSuplementosDeHoy(userId: string): Promise<SuplementoHoy[]> {
  const hoy = getLocalToday();
  const [filas, logs] = await Promise.all([
    supabase.from('user_supplements')
      .select('id, name, source, is_active')
      .eq('user_id', userId)
      .eq('source', 'coach')
      .eq('is_active', true),
    supabase.from('supplement_logs')
      .select('supplement_id, taken, units_taken')
      .eq('user_id', userId)
      .eq('date', hoy),
  ]);
  if (filas.error) throw new Error(`[elite-hoy] user_supplements: ${filas.error.message}`);
  if (logs.error) throw new Error(`[elite-hoy] supplement_logs: ${logs.error.message}`);
  return suplementosDeHoy(
    (filas.data ?? []) as unknown as FilaSuplementoHoy[],
    (logs.data ?? []) as unknown as LogSuplementoHoy[],
  );
}

/**
 * El objetivo activo (user_packs) con su senal. Se lee directo y no por
 * pack-service para no arrastrar el grafo entero del instalador a HOY. Un
 * fallo aqui degrada a "sin objetivo" con aviso en el log: es una linea de
 * contexto, no un dato que la persona registro.
 */
export async function leerObjetivoActivo(userId: string): Promise<ObjetivoHoy | null> {
  const { data, error } = await supabase
    .from('user_packs')
    .select('pack_key, activated_at, active')
    .eq('user_id', userId);
  if (error) {
    logWarn('[elite-hoy] user_packs no se pudo leer; la linea del objetivo se omite', error);
    return null;
  }
  return objetivoActivo((data ?? []) as unknown as FilaPackHoy[]);
}
