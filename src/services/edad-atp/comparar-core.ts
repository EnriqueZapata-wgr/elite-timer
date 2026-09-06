/**
 * comparar-core (ATP 3.0, 6-sep-2026, ruta 2.5): comparar dos estudios en el
 * tiempo, marcador por marcador. Nucleo PURO: sin I/O, sin React.
 *
 * Que hace:
 *   1. Saca las FECHAS DE ESTUDIO que existen en las series (`lab_values` no
 *      tiene id de estudio: la fecha `measured_at` es el estudio).
 *   2. Empareja, para dos fechas A (anterior) y B (reciente), el valor de cada
 *      marcador en cada una.
 *   3. Dice si cada marcador MEJORO, EMPEORO o sigue IGUAL. La direccion
 *      deseada no es "subio" o "bajo": es la ventana funcional de la matriz V7.
 *      Acercarse a la ventana es mejorar; alejarse es empeorar (misma doctrina
 *      que `deltaVsAnterior` en labs-premium-core). Si el marcador no tiene
 *      ventana en la matriz, no hay juicio: solo se reporta la diferencia.
 *
 * Los valores llegan en la unidad en que `lab_values` los guardo. Para juzgar
 * se llevan a la unidad de la matriz con `aUnidadDeMatriz` (la testosterona se
 * guarda en ng/dL y la matriz la ve en ng/mL); la diferencia que se PINTA se
 * calcula en la unidad guardada, que es la que la persona reconoce.
 */
import { findMatrizParam, functionalBand } from '@/src/constants/edad-atp-matriz-lookup';
import { aUnidadDeMatriz } from '@/src/constants/lab-unidades-core';
import { distanciaAVentana } from '@/src/services/edad-atp/labs-premium-core';
import type { Sex } from '@/src/types/edad-atp-v2';

export interface PuntoComparable {
  value: number | null;
  measured_at: string;
}

export type SeriesPorMarcador = Record<string, PuntoComparable[]>;

/**
 * Fechas distintas con al menos un valor real, de la mas reciente a la mas
 * antigua. Una fecha cuyos puntos son todos null no es un estudio.
 */
export function fechasDeEstudio(series: SeriesPorMarcador): string[] {
  const set = new Set<string>();
  for (const puntos of Object.values(series)) {
    for (const p of puntos ?? []) {
      if (p.value != null && Number.isFinite(p.value) && p.measured_at) set.add(p.measured_at);
    }
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

/**
 * Las dos fechas por defecto: la mas reciente como B y la anterior como A.
 * null con menos de dos: entonces no hay nada que comparar y la pantalla lo
 * dice en vez de inventar una fila plana.
 */
export function fechasPorDefecto(fechas: string[]): { a: string; b: string } | null {
  if (fechas.length < 2) return null;
  return { a: fechas[1], b: fechas[0] };
}

/** El valor de un marcador en una fecha. Con varios ese dia, el ultimo real. */
export function valorEnFecha(puntos: PuntoComparable[] | undefined, fecha: string): number | null {
  let out: number | null = null;
  for (const p of puntos ?? []) {
    if (p.measured_at === fecha && p.value != null && Number.isFinite(p.value)) out = p.value;
  }
  return out;
}

/**
 * `mejoro` / `empeoro` / `igual` cuando la matriz conoce la ventana.
 * `sin_juicio` cuando no: se muestra la diferencia y nada mas.
 */
export type Flecha = 'mejoro' | 'empeoro' | 'igual' | 'sin_juicio';

/**
 * La flecha de un marcador entre dos valores, leida contra la ventana
 * funcional. Ambos valores se comparan por su DISTANCIA a la ventana: dentro
 * es cero. Dos valores dentro de la ventana son `igual` aunque el numero se
 * haya movido: no hay nada que celebrar ni que corregir ahi.
 */
export function flechaDe(
  valorA: number,
  valorB: number,
  ventana: { lo: number; hi: number } | null,
): Flecha {
  if (!ventana) return 'sin_juicio';
  const dA = distanciaAVentana(valorA, ventana);
  const dB = distanciaAVentana(valorB, ventana);
  if (dA == null || dB == null) return 'sin_juicio';
  // Tolerancia minima: dos distancias que solo difieren por redondeo de punto
  // flotante no son una mejora ni un retroceso.
  if (Math.abs(dA - dB) < 1e-9) return 'igual';
  return dB < dA ? 'mejoro' : 'empeoro';
}

export interface FilaComparacion {
  key: string;
  /** Valor en la fecha A (anterior), unidad guardada. null si ese estudio no lo trajo. */
  valorA: number | null;
  /** Valor en la fecha B (reciente), unidad guardada. */
  valorB: number | null;
  /** B menos A en unidad guardada. null si falta alguno. */
  delta: number | null;
  /** null si falta alguno de los dos valores: sin par no hay flecha. */
  flecha: Flecha | null;
}

/** La ventana funcional de la matriz para este sexo y clave, en unidad de matriz. */
export function ventanaDe(sex: Sex, key: string): { lo: number; hi: number } | null {
  return functionalBand(findMatrizParam(sex, key));
}

/**
 * Una fila por marcador que tenga valor en A o en B. Las filas con los dos
 * valores van primero (son las que se pueden comparar), y dentro de cada
 * grupo, alfabetico por clave: la pantalla reordena por dominio si quiere.
 */
export function emparejar(
  sex: Sex,
  series: SeriesPorMarcador,
  fechaA: string,
  fechaB: string,
): FilaComparacion[] {
  const filas: FilaComparacion[] = [];
  for (const [key, puntos] of Object.entries(series)) {
    const valorA = valorEnFecha(puntos, fechaA);
    const valorB = valorEnFecha(puntos, fechaB);
    if (valorA == null && valorB == null) continue;
    let delta: number | null = null;
    let flecha: Flecha | null = null;
    if (valorA != null && valorB != null) {
      delta = valorB - valorA;
      flecha = flechaDe(aUnidadDeMatriz(key, valorA), aUnidadDeMatriz(key, valorB), ventanaDe(sex, key));
    }
    filas.push({ key, valorA, valorB, delta, flecha });
  }
  filas.sort((x, y) => {
    const px = x.flecha == null ? 1 : 0;
    const py = y.flecha == null ? 1 : 0;
    return px - py || x.key.localeCompare(y.key);
  });
  return filas;
}

export interface ResumenComparacion {
  mejoraron: number;
  empeoraron: number;
  igual: number;
  sinJuicio: number;
  /** Marcadores que solo estan en uno de los dos estudios. */
  sinPar: number;
}

export function resumirComparacion(filas: FilaComparacion[]): ResumenComparacion {
  const r: ResumenComparacion = { mejoraron: 0, empeoraron: 0, igual: 0, sinJuicio: 0, sinPar: 0 };
  for (const f of filas) {
    if (f.flecha == null) r.sinPar += 1;
    else if (f.flecha === 'mejoro') r.mejoraron += 1;
    else if (f.flecha === 'empeoro') r.empeoraron += 1;
    else if (f.flecha === 'igual') r.igual += 1;
    else r.sinJuicio += 1;
  }
  return r;
}

/** La frase del encabezado. Habla de ventanas, no de numeros que suben o bajan. */
export function fraseComparacion(r: ResumenComparacion): string {
  const comparados = r.mejoraron + r.empeoraron + r.igual;
  if (comparados === 0 && r.sinJuicio === 0) return 'Estos dos estudios no comparten marcadores.';
  if (comparados === 0) return `${r.sinJuicio} marcadores en los dos estudios, ninguno con rango funcional para juzgar.`;
  const partes: string[] = [];
  if (r.mejoraron > 0) partes.push(r.mejoraron === 1 ? '1 se acercó a tu ventana' : `${r.mejoraron} se acercaron a tu ventana`);
  if (r.empeoraron > 0) partes.push(r.empeoraron === 1 ? '1 se alejó' : `${r.empeoraron} se alejaron`);
  if (r.igual > 0) partes.push(r.igual === 1 ? '1 se mantiene' : `${r.igual} se mantienen`);
  return `${partes.join(', ')}.`;
}

/** Diferencia con signo y decimales segun magnitud, para pintar. */
export function formateaDelta(delta: number): string {
  const abs = Math.abs(delta);
  const dec = abs >= 10 ? 0 : abs >= 1 ? 1 : 2;
  const signo = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return `${signo}${abs.toFixed(dec)}`;
}
