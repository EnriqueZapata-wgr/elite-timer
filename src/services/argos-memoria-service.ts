/**
 * Lectura de la memoria de conversaciones para ARGOS (21-sep-2026). I/O.
 *
 * Lee las últimas conversaciones del usuario en `argos_conversations` (title,
 * messages, updated_at) y arma el bloque con `argos-memoria-core`. La
 * conversación ACTUAL se excluye: ya viaja completa en los mensajes del turno
 * (o resumida por argos-history-core); repetirla aquí sería contradecirse.
 *
 * Cache por usuario, en memoria de módulo, con TTL corto. Leer seis
 * conversaciones completas en CADA turno del chat es pagar la misma consulta
 * muchas veces; con el cache se lee una vez por ventana.
 * `anotarConversacionGuardada` mantiene el cache exacto sin releer: cada save
 * del chat deja ahí la fila que acaba de escribir, así la conversación que se
 * cierra ya está en la memoria de la siguiente sin esperar al TTL.
 *
 * Regla de la casa: un error de lectura NO se cachea ni se convierte en "sin
 * conversaciones previas". Si hay cache (aunque haya vencido) se sirve con
 * aviso, porque una memoria de hace unos minutos vale más que ninguna; si no
 * hay, lanza y loadUserContext lo registra como bloque no leído (viaja al
 * modelo como "no pude leer las conversaciones previas").
 *
 * Privacidad: llave por userId; `.eq('user_id', userId)` en la consulta y RLS
 * en la tabla (050); `olvidarMemoriaConversaciones()` se llama al cerrar
 * sesión (auth-context) para que otra cuenta en el mismo teléfono no herede
 * nada. Sin consentimiento de memoria ni siquiera se llega aquí: el gate vive
 * en loadUserContext, antes de todos los bloques.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { bloqueMemoria, MEMORIA_MAX_CONVERSACIONES, type ConversacionParaMemoria } from './argos-memoria-core';

interface EntradaCache {
  filas: ConversacionParaMemoria[];
  leidoEn: number;
}

const cachePorUsuario = new Map<string, EntradaCache>();

/** Cada cuánto, como mucho, se vuelve a leer la base. */
export const MEMORIA_TTL_MS = 5 * 60 * 1000;

/** Una de más para poder excluir la actual y seguir teniendo cinco. */
const FILAS_A_LEER = MEMORIA_MAX_CONVERSACIONES + 1;

/** Borra la entrada de un usuario (o todas): cierre de sesión, renombrar, borrar. */
export function olvidarMemoriaConversaciones(userId?: string): void {
  if (userId) cachePorUsuario.delete(userId);
  else cachePorUsuario.clear();
}

/**
 * El chat acaba de guardar esta conversación: el cache la adopta tal cual,
 * al frente, sin releer. Si no hay cache para el usuario no hay nada que
 * mantener (la próxima lectura la traerá de la base).
 */
export function anotarConversacionGuardada(userId: string, fila: ConversacionParaMemoria): void {
  const entrada = cachePorUsuario.get(userId);
  if (!entrada) return;
  entrada.filas = [fila, ...entrada.filas.filter((f) => f.id !== fila.id)].slice(0, FILAS_A_LEER);
}

/** Cuántas filas hay en cache para un usuario (para tests y diagnóstico). */
export function filasEnCache(userId: string): number {
  return cachePorUsuario.get(userId)?.filas.length ?? 0;
}

async function filasRecientes(userId: string, ahoraMs: number): Promise<ConversacionParaMemoria[]> {
  const cache = cachePorUsuario.get(userId);
  if (cache && ahoraMs - cache.leidoEn < MEMORIA_TTL_MS) return cache.filas;
  try {
    // supabase-js no lanza en 4xx: sin el `throw` un error de lectura sería
    // "sin conversaciones previas", que es justo lo que no puede pasar.
    const { data, error } = await supabase
      .from('argos_conversations')
      .select('id, title, messages, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(FILAS_A_LEER);
    if (error) throw error;
    const filas = (data ?? []) as ConversacionParaMemoria[];
    cachePorUsuario.set(userId, { filas, leidoEn: ahoraMs });
    return filas;
  } catch (e) {
    if (cache) {
      logWarn('[argos-memoria] lectura fallida, se sirve el cache anterior:', e);
      return cache.filas;
    }
    throw e;
  }
}

/**
 * El bloque "LO QUE HABLARON ANTES" para este usuario, sin la conversación
 * actual. '' si no hay conversaciones previas. Lanza si no se pudo leer y no
 * había cache.
 */
export async function leerMemoriaConversaciones(
  userId: string,
  conversacionActualId: string | null,
  ahora: Date = new Date(),
): Promise<string> {
  const filas = await filasRecientes(userId, ahora.getTime());
  const previas = conversacionActualId ? filas.filter((f) => f.id !== conversacionActualId) : filas;
  return bloqueMemoria(previas, ahora);
}
