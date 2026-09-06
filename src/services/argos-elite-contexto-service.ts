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
 * RPC de carga), así que releerla en cada turno del chat sería pagar la misma
 * consulta cientos de veces. `invalidarContextoElite` existe para el canje de
 * código y para la pantalla de la evaluación, si quieren forzar relectura.
 *
 * Regla 7: un error de lectura NO se cachea como "no tiene". Solo se guarda
 * un resultado cuando la consulta respondió sin error.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { construirBloqueElite, resumenDesdeFila, type FilaEliteParaArgos } from './argos-elite-contexto-core';

const cachePorUsuario = new Map<string, { bloque: string; leidoEn: number }>();

/**
 * Un "no tiene evaluación" caduca a los 15 minutos: si el equipo carga la
 * evaluación mientras la app está abierta, ARGOS la ve sin reinicio. Un
 * bloque con contenido se queda toda la sesión (cambia cada meses).
 */
const TTL_VACIO_MS = 15 * 60 * 1000;

/** Borra la entrada de un usuario (o todas) para forzar relectura. */
export function invalidarContextoElite(userId?: string): void {
  if (userId) cachePorUsuario.delete(userId);
  else cachePorUsuario.clear();
}

/**
 * Bloque Elite listo para el system prompt, o '' si el usuario no tiene
 * evaluación. Lanza si la lectura falló y no había cache: el llamador
 * (loadUserContext) lo registra como bloque con error, no como vacío.
 */
export async function cargarBloqueElite(userId: string): Promise<string> {
  const enCache = cachePorUsuario.get(userId);
  if (enCache && (enCache.bloque || Date.now() - enCache.leidoEn < TTL_VACIO_MS)) return enCache.bloque;

  const { data, error } = await supabase
    .from('functional_dx')
    .select('summary_text, sources_snapshot')
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
  const bloque = construirBloqueElite(resumen);
  cachePorUsuario.set(userId, { bloque, leidoEn: Date.now() });
  return bloque;
}
