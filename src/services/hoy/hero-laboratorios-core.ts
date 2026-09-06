/**
 * Hero de HOY: "Tus laboratorios y tu Edad ATP" (ATP 3.0, 6-sep-2026, ruta
 * 2.1). Lógica PURA: decide cuál de los estados pinta la tarjeta y arma el
 * texto del delta. Sin React ni Supabase, para que corra en node.
 *
 * Por qué existe: el pivote pide que lo primero que vea una persona nueva en
 * HOY sea una sola dirección (subir su estudio) y, cuando ya lo subió, su
 * Edad ATP y sus tres marcadores de mayor impacto. La regla 7 de la casa
 * obliga a distinguir "no se pudo leer" (reintentar) de "no hay estudio"
 * (subir uno), y esa distinción vive aquí, no en el componente.
 *
 * El delta usa la convención canónica de edad-delta-core (positivo = más
 * joven); nadie vuelve a calcular el signo a mano.
 */
import { classifyEdadDelta, edadDeltaYears } from '@/src/services/edad-atp/edad-delta-core';
import {
  marcadoresAbiertosFree,
  type EstadoMarcador,
  type MarcadorParaImpacto,
} from '@/src/services/subscription/limites-free-core';

export type EstadoHero = 'cargando' | 'no_se_pudo_leer' | 'sin_estudio' | 'con_estudio';

export interface EdadHero {
  integral: number;
  cronologica: number;
}

export interface MarcadorHero extends MarcadorParaImpacto {
  /** Nombre que ve la persona ("Glucosa en ayuno"). */
  etiqueta: string;
}

export interface DatosHero {
  /** Hay al menos un valor de laboratorio no anulado. */
  tieneEstudio: boolean;
  /** Último cálculo persistido de Edad ATP, o null si nunca se calculó. */
  edad: EdadHero | null;
  /** Todos los marcadores medidos con su estado contra la ventana funcional. */
  marcadores: MarcadorHero[];
}

/**
 * Qué pinta la tarjeta. `cargando` gana mientras no haya datos ni fallo;
 * un fallo gana sobre datos viejos solo cuando no hay datos (si la lectura
 * anterior sirvió, se sigue enseñando y el reintento queda para el fallo
 * visible en la siguiente carga vacía).
 */
export function decidirEstadoHero(
  datos: DatosHero | null,
  cargando: boolean,
  fallo: boolean,
): EstadoHero {
  if (datos) return datos.tieneEstudio ? 'con_estudio' : 'sin_estudio';
  if (fallo) return 'no_se_pudo_leer';
  if (cargando) return 'cargando';
  return 'no_se_pudo_leer';
}

/** "7 años" o "7.5 años"; singular con 1. Solo el número, sin signo. */
function aniosTexto(abs: number): string {
  const n = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${n} ${abs === 1 ? 'año' : 'años'}`;
}

/**
 * El texto del delta, sin juicio: "7 años más joven", "3 años por encima" o
 * "En línea con tu edad real". El signo sale de edad-delta-core.
 */
export function textoDeltaEdad(edad: EdadHero): string {
  const delta = edadDeltaYears(edad.cronologica, edad.integral);
  switch (classifyEdadDelta(delta)) {
    case 'even': return 'En línea con tu edad real';
    case 'younger': return `${aniosTexto(Math.abs(delta))} más joven`;
    case 'older': return `${aniosTexto(Math.abs(delta))} por encima`;
  }
}

/** Con qué tono se pinta el delta: exito (más joven), neutro (en línea) o advertencia. */
export type TonoDelta = 'exito' | 'neutro' | 'advertencia';

export function tonoDeltaEdad(edad: EdadHero): TonoDelta {
  switch (classifyEdadDelta(edadDeltaYears(edad.cronologica, edad.integral))) {
    case 'younger': return 'exito';
    case 'older': return 'advertencia';
    default: return 'neutro';
  }
}

/** Edad ATP redondeada a un decimal para el número grande ("41.3"). */
export function edadIntegralTexto(edad: EdadHero): string {
  return edad.integral.toFixed(1);
}

/**
 * Los tres marcadores de mayor impacto, en el mismo orden que Free ve con
 * ficha (marcadoresAbiertosFree): así el hero y la lista de labs cuentan la
 * misma historia. Con tres o menos medidos, salen todos.
 */
export function top3Marcadores(marcadores: ReadonlyArray<MarcadorHero>): MarcadorHero[] {
  const porKey = new Map<string, MarcadorHero>();
  for (const m of marcadores) if (!porKey.has(m.key)) porKey.set(m.key, m);
  return marcadoresAbiertosFree(marcadores)
    .map((k) => porKey.get(k))
    .filter((m): m is MarcadorHero => m != null);
}

/** Copy corto del semáforo de cada marcador. `sin_banda` no es malo: falta rango. */
export const ETIQUETA_ESTADO_HERO: Record<EstadoMarcador, string> = {
  optimo: 'En tu ventana',
  aceptable: 'Aceptable',
  atencion: 'Pide atención',
  sin_banda: 'Sin rango',
};

/** Cuántos de los medidos están fuera de la ventana óptima (para la línea de resumen). */
export function cuentaFueraDeVentana(marcadores: ReadonlyArray<MarcadorHero>): number {
  return marcadores.filter((m) => m.estado === 'atencion' || m.estado === 'aceptable').length;
}
