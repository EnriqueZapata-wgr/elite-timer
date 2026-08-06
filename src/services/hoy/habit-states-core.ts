/**
 * habit-states-core (MB-26 Pieza 1) — los tres estados del hábito, puros.
 *
 * HOY tenía puerta de entrada y no tenía puerta de salida: encendido o
 * apagado, y todo lo encendido vivía en la lista para siempre. Ahora un
 * hábito puede estar:
 *
 *   activo   → ocupa renglón en HOY.
 *   graduado → ya es parte de ti: sale de la lista, SE SIGUE MIDIENDO.
 *   reposo   → no ahorita: sale de HOY, conserva historial y racha.
 *
 * Reglas duras (con test de mutación en habit-states-core.test.ts):
 *
 *  · SIN FILA = ACTIVO. Nadie pierde nada al actualizar.
 *  · El filtro de estados toca SOLO el renglón (display + score del día).
 *    El ledger de los verificados NO pasa por aquí: un graduado con
 *    actividad real sigue ganando su electrón (ledgerKeys ignora estados).
 *  · Nada se borra: los estados viven en su tabla; las listas persistidas
 *    (active_boolean_electrons), el blob del día y electron_logs no se
 *    tocan al graduar ni al reposar.
 *
 * ⚠️ El hueco clase checkin (day-booleans.ts:26-47): un hábito filtrado
 * del compile cuya puerta de encendido no lo devuelve a activo sería un
 * "toggle silencioso" nuevo — el usuario lo enciende y la card jamás
 * aparece. Por eso TODA puerta que encienda hábitos (installApp,
 * hoy-habitos, aplicar pack) debe llamar reactivarHabitos(...) del
 * servicio. El contrato está amarrado en tests.
 */

export type HabitEstado = 'activo' | 'graduado' | 'reposo';

export interface HabitEstadoRow {
  habit_key: string;
  state: HabitEstado;
  graduated_at?: string | null;
  paused_at?: string | null;
}

/** Estados por llave. null (lectura fallida o migración 255 pendiente) o
 *  filas ilegibles → {} = todos activos: el comportamiento de siempre. */
export function estadosPorKey(rows: HabitEstadoRow[] | null): Record<string, HabitEstado> {
  const out: Record<string, HabitEstado> = {};
  for (const r of rows ?? []) {
    if (r?.habit_key && (r.state === 'graduado' || r.state === 'reposo' || r.state === 'activo')) {
      out[r.habit_key] = r.state;
    }
  }
  return out;
}

/** SIN FILA = ACTIVO (la regla que protege a todo usuario existente). */
export function estadoDe(key: string, estados: Record<string, HabitEstado>): HabitEstado {
  return estados[key] ?? 'activo';
}

/** Los renglones que HOY pinta y cuenta: solo los activos. */
export function renglonesActivos<T extends { source: string }>(
  items: T[],
  estados: Record<string, HabitEstado>,
): T[] {
  return items.filter((i) => estadoDe(i.source, estados) === 'activo');
}

/** Igual que renglonesActivos pero sobre llaves sueltas. */
export function keysActivas(keys: string[], estados: Record<string, HabitEstado>): string[] {
  return keys.filter((k) => estadoDe(k, estados) === 'activo');
}

/** El estante: lo que ya es parte de ti. */
export function keysGraduadas(estados: Record<string, HabitEstado>): string[] {
  return Object.keys(estados).filter((k) => estados[k] === 'graduado');
}

export function keysEnReposo(estados: Record<string, HabitEstado>): string[] {
  return Object.keys(estados).filter((k) => estados[k] === 'reposo');
}

/**
 * Las llaves cuyo ledger se reconcilia: TODAS las que traen evidencia.
 * Graduar quita el renglón, NUNCA el crédito — por eso esta función ignora
 * los estados a propósito (la mutación que filtre por estado truena en
 * test: un verificado graduado dejaría de ganar su electrón).
 */
export function ledgerKeys(evidencias: Record<string, unknown>): string[] {
  return Object.keys(evidencias);
}
