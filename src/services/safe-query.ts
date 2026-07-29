/**
 * safe-query (MB-12 · D-1) — la clase {error}.
 *
 * supabase-js NO lanza en 4xx/5xx: el error llega en { error } y un
 * try/catch nunca lo ve. El resultado histórico: cuando el servidor falla,
 * la app pinta "0", "vacío" o "escribe tu primera entrada" — le dice al
 * usuario que sus datos no existen.
 *
 * Estos helpers obligan a distinguir los TRES estados:
 *   cargando (aún no hay respuesta) · vacío (respuesta sin filas) · falló.
 * Cuando hay error devuelven null — nunca [] ni 0 — para que la UI pueda
 * diferenciar "no tienes datos" de "no pudimos leerlos".
 * Modelo a seguir en UI: routine-generator.tsx (estado de error + Reintentar).
 * Modelo a seguir en servicios: checkin-service.saveCheckin (propaga, no traga).
 */
import { warn as logWarn } from '../lib/logger';

export interface SupaResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

/**
 * data si la consulta respondió bien; null si falló (y loguea con tag).
 * El vacío real sigue siendo [] / objeto — null significa SOLO fallo.
 *
 *   const rows = dataOrNull('mente/journal', await supabase.from(...).select(...));
 *   if (rows === null) { setLoadError(true); return; }
 */
export function dataOrNull<T>(tag: string, res: SupaResult<T>): T | null {
  if (res.error) {
    logWarn(`[${tag}] query failed:`, res.error.message ?? res.error);
    return null;
  }
  return res.data;
}

/** Igual que dataOrNull pero garantiza arreglo en éxito ([] si data null). */
export function rowsOrNull<T>(tag: string, res: SupaResult<T[]>): T[] | null {
  if (res.error) {
    logWarn(`[${tag}] query failed:`, res.error.message ?? res.error);
    return null;
  }
  return res.data ?? [];
}
