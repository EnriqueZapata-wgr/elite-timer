/**
 * techo-core (MB-26 Pieza 3 · reconvertido en MB-27 V3) — el CONTEO de
 * renglones del día, puro. El techo como LÍMITE murió por decisión de
 * Enrique: "Yo no quiero techo. Puede instalar todo si quiere. Solo
 * orientar." Ningún Alert, ningún umbral, ninguna puerta que bloquee.
 *
 * Lo que queda de aquí:
 *  · renglonesDeHoy / contarEncendido: el número honesto de renglones
 *    activos — HOY lo pinta SIEMPRE (sin umbral) junto a la salida
 *    "Ordenar mi día". Espeja las reglas del compile: unión persistido +
 *    MANDATORY, filtro de estados, cuantitativos sin fuente fuera, y la
 *    lista que se enciende es la MISMA que reactiva installApp (B2).
 *  · candidatosAReposo / diasSinHacer: "lo que más te ha costado" — vive
 *    para /ordenar-dia, donde el usuario va cuando QUIERE ordenar. No se
 *    le empuja cuando está haciendo otra cosa.
 *
 * Ningún estado cambia desde este módulo. La graduación, el reposo y
 * /ordenar-dia (la puerta de salida, lo valioso de MB-26) siguen intactos.
 */
import { MANDATORY_BOOLEANS } from '@/src/services/hoy/day-booleans';
import {
  estadoDe, type HabitEstado,
} from '@/src/services/hoy/habit-states-core';
import { ultimasFechas, type HistorialHabitos } from '@/src/services/hoy/graduacion-core';

/** Espejo de day-compiler / install-core: sin fuente hasta wearables. */
const QUANTS_SIN_FUENTE = new Set(['steps', 'sleep']);

export interface PrefsRenglones {
  booleans: string[];
  quants: string[];
}

/** Los renglones activos de hoy, con las reglas del compile.
 *  MB-27 0.2: el filtro de quants sin fuente cubre TODO el conteo, no solo
 *  prefs.quants — un candidato nuevo (contarEncendido mete los nuevos por
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

/**
 * ¿En cuántos renglones queda el día si se encienden `nuevos`? Simula el
 * encendido (las llaves nuevas vuelven a activo, como reactivarHabitos) y
 * cuenta. ES INFORMACIÓN, no un juicio: aquí no hay umbral ni "excede".
 */
export function contarEncendido(
  prefs: PrefsRenglones,
  estados: Record<string, HabitEstado>,
  nuevos: string[],
): number {
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
  return new Set(renglonesDeHoy(despues, estadosDespues)).size;
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
 * hacerse, de mayor a menor abandono. Vive para /ordenar-dia (donde el
 * usuario va cuando QUIERE ordenar). `excluir` = lo que se está por
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
