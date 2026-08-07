/**
 * techo-core (MB-26 Pieza 3) — el techo del día, puro.
 *
 * OCHO renglones activos. No es configuración: es el default que protege
 * el día. Encender el noveno (a mano o por pack) avisa y ofrece qué mandar
 * a reposo, con candidatos sugeridos (los que llevas más tiempo fallando).
 * El usuario puede pasarse si insiste: guiado, no prisionero — se avisa y
 * se respeta la decisión. Aquí solo se cuenta y se sugiere; ningún estado
 * cambia desde este módulo.
 *
 * ⚠️ El techo cuenta ACTIVOS, no graduados: graduar libera renglón (ese es
 * el premio). El conteo espeja las reglas del compile: unión persistido +
 * MANDATORY, filtro de estados, cuantitativos sin fuente fuera.
 */
import { MANDATORY_BOOLEANS } from '@/src/services/hoy/day-booleans';
import {
  estadoDe, type HabitEstado,
} from '@/src/services/hoy/habit-states-core';
import { ultimasFechas, type HistorialHabitos } from '@/src/services/hoy/graduacion-core';

export const TECHO_RENGLONES = 8;

/** Espejo de day-compiler / install-core: sin fuente hasta wearables. */
const QUANTS_SIN_FUENTE = new Set(['steps', 'sleep']);

export interface PrefsRenglones {
  booleans: string[];
  quants: string[];
}

/** Los renglones activos de hoy, con las reglas del compile.
 *  MB-27 0.2: el filtro de quants sin fuente cubre TODO el conteo, no solo
 *  prefs.quants — un candidato nuevo (evaluarEncendido mete los nuevos por
 *  booleans) como 'sleep' sumaba un renglón fantasma que HOY nunca pinta. */
export function renglonesDeHoy(
  prefs: PrefsRenglones,
  estados: Record<string, HabitEstado>,
): string[] {
  const bools = Array.from(new Set([...prefs.booleans, ...MANDATORY_BOOLEANS]));
  return [...bools, ...prefs.quants]
    .filter((k) => !QUANTS_SIN_FUENTE.has(k))
    .filter((k) => estadoDe(k, estados) === 'activo');
}

export interface EvaluacionTecho {
  /** true si el resultado rebasa el techo (hay que avisar). */
  excede: boolean;
  /** Renglones activos que quedarían después de encender. */
  total: number;
  techo: number;
}

/**
 * ¿Encender `nuevos` rebasa el techo? Simula el encendido: las llaves
 * nuevas vuelven a activo (reactivarHabitos) y entran a la lista.
 */
export function evaluarEncendido(
  prefs: PrefsRenglones,
  estados: Record<string, HabitEstado>,
  nuevos: string[],
): EvaluacionTecho {
  const estadosDespues: Record<string, HabitEstado> = { ...estados };
  for (const k of nuevos) estadosDespues[k] = 'activo';
  const despues: PrefsRenglones = {
    booleans: Array.from(new Set([...prefs.booleans, ...nuevos])),
    // Las llaves cuantitativas ya vienen en prefs.quants o entran como
    // booleans arriba sin efecto (el filtro de renglonesDeHoy no distingue
    // el origen: una llave cuenta una vez gracias al Set del caller).
    quants: prefs.quants,
  };
  // Dedup total: una llave que viva en ambas listas cuenta UNA vez.
  const total = new Set(renglonesDeHoy(despues, estadosDespues)).size;
  return { excede: total > TECHO_RENGLONES, total, techo: TECHO_RENGLONES };
}

/** Días desde el último hecho dentro de la ventana; ventana+1 = nunca. */
export function diasSinHacer(
  hechas: ReadonlySet<string> | undefined,
  hoy: string,
  ventana = 35,
): number {
  if (!hechas || hechas.size === 0) return ventana + 1;
  const fechas = ultimasFechas(hoy, ventana); // ascendente, termina en hoy
  for (let i = fechas.length - 1; i >= 0; i--) {
    if (hechas.has(fechas[i])) return fechas.length - 1 - i;
  }
  return ventana + 1;
}

/**
 * Candidatos a reposo: los renglones activos que llevan MÁS tiempo sin
 * hacerse, de mayor a menor abandono. `excluir` = lo que se está por
 * encender (sugerir reposar lo que vienes a prender sería absurdo).
 */
export function candidatosAReposo(
  activos: string[],
  historial: HistorialHabitos,
  hoy: string,
  excluir: string[] = [],
  max = 3,
): string[] {
  const fuera = new Set(excluir);
  return activos
    .filter((k) => !fuera.has(k))
    .map((k) => ({ k, dias: diasSinHacer(historial[k], hoy) }))
    .sort((a, b) => b.dias - a.dias || a.k.localeCompare(b.k))
    .slice(0, max)
    .map((x) => x.k);
}
