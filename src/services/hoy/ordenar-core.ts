/**
 * ordenar-core (MB-26 Pieza 4) — los tres caminos de "Ordenar mi día", puros.
 *
 *  1. Empezar de cero: TODO a reposo y reconstruyes. Nada se desinstala y
 *     nada se borra: los hábitos solo salen de la lista.
 *  2. Quedarme con lo esencial: quedan activos los hábitos de tu pack
 *     aplicado más reciente; el resto a reposo.
 *  3. Que ARGOS proponga: lee tu adherencia real y sugiere qué graduar,
 *     qué dejar y qué parkear. PROPONE; el usuario acepta o edita. Nada se
 *     mueve solo — estas funciones devuelven cambios, jamás los ejecutan.
 *
 * ⚠️ Este flujo NO desinstala apps. Son cosas distintas: aquí solo se
 * calculan estados de hábitos (activo/graduado/reposo).
 */
import { habitosPorIntensidad, PACK_BY_KEY } from '@/src/constants/packs';
import type { UserPackRow } from '@/src/services/pack-core';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';
import {
  cumplidosEnVentana, esCandidatoAGraduar, type HistorialHabitos,
} from '@/src/services/hoy/graduacion-core';

export interface CambioEstado {
  key: string;
  state: HabitEstado;
}

/** Hecho ~la mitad de los últimos 21 días → se queda activo (camino 3). */
export const UMBRAL_MANTENER = { dias: 21, minimo: 11 } as const;

/** Camino 1: todo renglón activo pasa a reposo. */
export function planCero(renglonesActivos: string[]): CambioEstado[] {
  return renglonesActivos.map((key) => ({ key, state: 'reposo' as const }));
}

/** El pack aplicado más reciente del usuario (por fecha), o null. */
export function packMasReciente(rows: UserPackRow[] | null): UserPackRow | null {
  let mejor: UserPackRow | null = null;
  for (const r of rows ?? []) {
    if (!PACK_BY_KEY[r.pack_key]) continue;
    if (!mejor || r.activated_at > mejor.activated_at) mejor = r;
  }
  return mejor;
}

/** Los hábitos que ese pack enciende en su etapa aplicada. */
export function habitosDelPack(row: UserPackRow): string[] {
  const pack = PACK_BY_KEY[row.pack_key];
  if (!pack) return [];
  return habitosPorIntensidad(pack, row.intensidad).map((h) => h.electron as string);
}

/**
 * Camino 2: activos los del pack más reciente, el resto a reposo. Los del
 * pack que estuvieran en reposo o graduados vuelven a activo (quedarte con
 * lo esencial ES quedarte con ellos en la lista).
 */
export function planEsencial(
  renglonesActivos: string[],
  packHabits: string[],
): CambioEstado[] {
  const esenciales = new Set(packHabits);
  const cambios: CambioEstado[] = renglonesActivos
    .filter((k) => !esenciales.has(k))
    .map((key) => ({ key, state: 'reposo' as const }));
  for (const key of packHabits) {
    cambios.push({ key, state: 'activo' });
  }
  return cambios;
}

/**
 * Camino 3: la propuesta por adherencia real, hábito por hábito:
 *  · 30/35 cumplidos → graduar (ya es parte de ti).
 *  · ~la mitad de los últimos 21 → dejar activo (lo estás trabajando).
 *  · menos que eso (incluido nunca) → reposo (no ahorita; vuelve cuando
 *    quieras).
 * `sinLedger` = llaves que NO dejan rastro booleano (los cuantitativos:
 * proteína/agua ganan fracción, no fila). Para ellas la ausencia de
 * evidencia no es evidencia de nada → se quedan activas.
 */
export function planArgos(
  renglonesActivos: string[],
  historial: HistorialHabitos,
  hoy: string,
  sinLedger: ReadonlySet<string> = new Set(),
): CambioEstado[] {
  return renglonesActivos.map((key) => {
    if (sinLedger.has(key)) return { key, state: 'activo' as const };
    const hechas = historial[key];
    if (esCandidatoAGraduar(hechas, hoy)) return { key, state: 'graduado' as const };
    const mantiene = cumplidosEnVentana(hechas, hoy, UMBRAL_MANTENER.dias) >= UMBRAL_MANTENER.minimo;
    return { key, state: mantiene ? ('activo' as const) : ('reposo' as const) };
  });
}
