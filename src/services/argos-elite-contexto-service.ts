/**
 * Lectura del contexto Elite para ARGOS (ATP 3.0, 6-sep-2026, ruta 3.6). I/O.
 *
 * Lee la evaluación Elite más reciente del usuario en `functional_dx` (la fila
 * con `sources_snapshot.elite_v3` de mayor `version`; no se usa `is_current`
 * porque una versión automática posterior sin `elite_v3` se lo llevaría) y
 * arma el bloque con `argos-elite-contexto-core`.
 *
 * Cache por sesión: un Map por usuario que vive lo que viva el bundle. La
 * evaluación cambia una vez cada seis o doce meses (una versión nueva por el
 * RPC de carga), así que releerla completa en cada turno del chat sería pagar
 * la misma consulta cientos de veces. `invalidarContextoElite` existe para el
 * canje de código y para la pantalla de la evaluación, si quieren forzar
 * relectura.
 *
 * 20-sep-2026: el cache ya no es ciego a versiones nuevas. Cada minuto, como
 * mucho, se hace una lectura LIGERA (`version, created_at`, sin el JSONB) y
 * solo si cambió se vuelve a leer la fila completa. Antes un bloque con
 * contenido se quedaba toda la sesión y una evaluación nueva no se veía hasta
 * reiniciar la app. El "no tiene" usa la misma verificación: si el equipo
 * carga la evaluación con la app abierta, ARGOS la ve en un minuto.
 *
 * Regla 7: un error de lectura NO se cachea como "no tiene". Solo se guarda
 * un resultado cuando la consulta respondió sin error. Si la verificación
 * ligera falla y ya había cache, se sirve el cache con aviso: un bloque de
 * hace un minuto vale más que ninguno.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  cambioLaVersion,
  construirBloqueElite,
  detalleDesdeFila,
  firmaDesdeFila,
  resumenDesdeFila,
  type FilaEliteParaArgos,
  type VersionElite,
} from './argos-elite-contexto-core';

/** Lo que ARGOS recibe de la evaluación: resumen, detalle y quién la firma. */
export interface ContextoElite {
  /** Bloque resumen (encabezado del pivote + resumen de 1,800). '' si no hay evaluación. */
  bloque: string;
  /** Segundo bloque: alimentación, entrenamiento, genética, sistemas, porqués. '' si no hay. */
  detalle: string;
  /** interpretado_por.evaluacion, para "asignado por" en el plan de suplementos. */
  firma: string | null;
}

interface EntradaCache extends ContextoElite {
  version: VersionElite | null;
  verificadoEn: number;
}

const cachePorUsuario = new Map<string, EntradaCache>();

/** Cada cuánto, como mucho, se verifica la versión en la base. */
const TTL_VERIFICACION_MS = 60 * 1000;

/** Borra la entrada de un usuario (o todas) para forzar relectura. */
export function invalidarContextoElite(userId?: string): void {
  if (userId) cachePorUsuario.delete(userId);
  else cachePorUsuario.clear();
}

function versionDeFila(fila: { version?: number | null; created_at?: string | null } | null | undefined): VersionElite | null {
  if (!fila) return null;
  return {
    version: typeof fila.version === 'number' ? fila.version : null,
    created_at: typeof fila.created_at === 'string' ? fila.created_at : null,
  };
}

/** Lectura ligera: solo qué versión hay (sin el JSONB). Lanza si falla. */
async function leerVersionActual(userId: string): Promise<VersionElite | null> {
  const { data, error } = await supabase
    .from('functional_dx')
    .select('version, created_at')
    .eq('user_id', userId)
    .not('sources_snapshot->elite_v3', 'is', null)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;
  const fila = Array.isArray(data) ? (data[0] as { version?: number | null; created_at?: string | null } | undefined) : undefined;
  return versionDeFila(fila);
}

/** Lectura completa de la fila y armado de los dos bloques. Lanza si falla. */
async function leerContextoCompleto(userId: string): Promise<EntradaCache> {
  const { data, error } = await supabase
    .from('functional_dx')
    .select('summary_text, sources_snapshot, version, created_at')
    .eq('user_id', userId)
    .not('sources_snapshot->elite_v3', 'is', null)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;

  const fila = (Array.isArray(data) ? data[0] : null) as FilaEliteParaArgos | null | undefined;
  const resumen = resumenDesdeFila(fila);
  if (fila && !resumen) {
    // Hay evaluación pero ni summary_text ni un elite_v3 que valide: se avisa
    // al desarrollador y ARGOS sigue sin el bloque.
    logWarn('[argos-elite] la evaluación existe pero no produjo resumen; bloque omitido');
  }
  const detalle = detalleDesdeFila(fila);
  if (fila && resumen && !detalle) {
    logWarn('[argos-elite] la evaluación tiene resumen pero el snapshot no produjo detalle; va solo el resumen');
  }
  return {
    bloque: construirBloqueElite(resumen),
    detalle,
    firma: firmaDesdeFila(fila),
    version: versionDeFila(fila),
    verificadoEn: Date.now(),
  };
}

/**
 * Contexto Elite listo para el system prompt (resumen, detalle y firma), o
 * bloques vacíos si el usuario no tiene evaluación. Lanza si la lectura falló
 * y no había cache: el llamador (loadUserContext) lo registra como bloque
 * con error, no como vacío.
 */
export async function cargarContextoElite(userId: string): Promise<ContextoElite> {
  const enCache = cachePorUsuario.get(userId);
  if (enCache && Date.now() - enCache.verificadoEn < TTL_VERIFICACION_MS) return enCache;

  if (enCache) {
    let actual: VersionElite | null;
    try {
      actual = await leerVersionActual(userId);
    } catch (e) {
      // La verificación falló pero hay cache: se sirve lo de hace un rato y se
      // reintenta en el siguiente turno (no se mueve verificadoEn).
      logWarn(`[argos-elite] no se pudo verificar la versión; se usa el cache: ${String(e)}`);
      return enCache;
    }
    if (!cambioLaVersion(enCache.version, actual)) {
      enCache.verificadoEn = Date.now();
      return enCache;
    }
  }

  let entrada: EntradaCache;
  try {
    entrada = await leerContextoCompleto(userId);
  } catch (e) {
    // Sin cache se lanza (el llamador lo reporta como "no pude leer"). Con
    // cache, la versión anterior sigue siendo verdad de hace un rato: se
    // sirve con aviso y se reintenta en el siguiente turno.
    if (!enCache) throw e;
    logWarn(`[argos-elite] la relectura completa falló; se usa el cache anterior: ${String(e)}`);
    return enCache;
  }
  cachePorUsuario.set(userId, entrada);
  return entrada;
}

/** Solo el bloque resumen. Se conserva por compatibilidad; el chat usa `cargarContextoElite`. */
export async function cargarBloqueElite(userId: string): Promise<string> {
  return (await cargarContextoElite(userId)).bloque;
}
