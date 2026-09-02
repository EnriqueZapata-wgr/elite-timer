/**
 * Coach — recurrencia de la señal (pendiente 13.3 / T-15, 31-ago-2026).
 *
 * EL BUG: el orquestador del coach llamaba `selectCascadeLevel(q2, false)`
 * con la recurrencia CLAVADA en falso. La cascada (Bloque 7) tiene cinco
 * niveles y los dos de arriba (3 con amarillo, 4 con rojo) solo se alcanzan
 * si la señal RECURRE; con false, ARGOS jamás proponía tests de
 * autoevaluación por más veces que la misma señal saliera roja.
 *
 * DE DÓNDE SALE EL DATO: de `intervention_logs`, que guarda por turno el
 * semáforo (`question_2_result`) y la fecha. Una señal recurre si en la
 * ventana reciente ya hubo un turno con semáforo amarillo o rojo. Es la
 * definición que la tabla permite hoy: no guarda QUÉ señal fue (no hay
 * columna signal_description en 068/069), así que la recurrencia es "hubo
 * señal afectando hace poco", no "esta misma señal". Ver FLAG en el informe.
 *
 * Puro, sin supabase: se prueba en node.
 */

/** Días hacia atrás que cuentan como "recurre". Sin fuente clínica: es el
 *  horizonte operativo del coach (dos semanas), pendiente de firma de Mariana. */
export const VENTANA_RECURRENCIA_DIAS = 14;

export interface TurnoPrevio {
  question_2_result: string | null;
  created_at: string | null;
}

const AFECTA: ReadonlySet<string> = new Set(['amarillo', 'rojo']);

/** ISO desde el que la consulta debe traer turnos (ahora menos la ventana). */
export function desdeVentana(ahoraMs: number, ventanaDias: number = VENTANA_RECURRENCIA_DIAS): string {
  return new Date(ahoraMs - ventanaDias * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * ¿La señal recurre? true si algún turno previo dentro de la ventana tuvo
 * semáforo amarillo o rojo. Fechas ilegibles o futuras no cuentan: un dato
 * roto no puede subir la cascada.
 */
export function senalRecurre(
  previos: TurnoPrevio[] | null | undefined,
  ahoraMs: number,
  ventanaDias: number = VENTANA_RECURRENCIA_DIAS,
): boolean {
  if (!previos || previos.length === 0) return false;
  const desde = ahoraMs - ventanaDias * 24 * 60 * 60 * 1000;
  for (const t of previos) {
    if (!t.question_2_result || !AFECTA.has(t.question_2_result)) continue;
    if (!t.created_at) continue;
    const ms = new Date(t.created_at).getTime();
    if (!Number.isFinite(ms)) continue;
    if (ms >= desde && ms <= ahoraMs) return true;
  }
  return false;
}
