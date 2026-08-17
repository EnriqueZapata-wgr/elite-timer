/**
 * labs-premium-core — lo que le faltaba a ATP Labs para leerse como producto
 * premium. Núcleo PURO: sin I/O, sin React, testeable con node.
 *
 * QUÉ SE TOMÓ DE LA REFERENCIA Y QUÉ NO.
 * Se investigó cómo presenta un panel la empresa de análisis de sangre que puso
 * el dueño de referencia. Tres cosas suyas valen y entran aquí:
 *
 *   1. EL CONTEO COMO TITULAR. Antes de la lista, cuántos están óptimos,
 *      cuántos aceptables y cuántos piden atención. Es lo primero que la
 *      persona quiere saber.
 *   2. EL FILTRO A LO QUE PIDE ATENCIÓN. Todas las reseñas de usuarias reales
 *      describen el mismo gesto espontáneo: filtrar directo a lo que está
 *      fuera. Si ese es el flujo real, se le da un botón.
 *   3. NUNCA ALARMAR POR UN MARCADOR SOLO. Su ficha gana confianza cuando
 *      contextualiza con el marcador vecino, y la pierde donde no lo hace.
 *
 * Y una cosa NO se copió: inflar el conteo con marcadores derivados sin
 * significado. Es su crítica más repetida en prensa especializada. Aquí un
 * parámetro sin banda funcional en la matriz NO cuenta ni para bien ni para
 * mal: se reporta aparte como "pendiente de rango".
 *
 * LO QUE ES NUESTRO Y ELLOS NO TIENEN.
 *   · El delta contra la medición anterior leído CONTRA TU VENTANA. No es
 *     "subió 12": es "se acercó a tu rango" o "se alejó". Esa comparación es
 *     el hueco abierto de toda la categoría: la venden aparte y nadie la ha
 *     descrito funcionando.
 *   · La fase del ciclo como contexto de lectura. No la mencionan en ningún
 *     lado, y es doctrina de la casa.
 */
import { findMatrizParam, functionalBand } from '@/src/constants/edad-atp-matriz-lookup';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';
import { aUnidadDeMatriz } from '@/src/constants/lab-unidades-core';
import type { Sex } from '@/src/types/edad-atp-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Estado de un parámetro
// ─────────────────────────────────────────────────────────────────────────────

/** `sin_banda` no es un estado malo: es "la matriz todavía no lo define". */
export type EstadoLab = 'optimo' | 'aceptable' | 'atencion' | 'sin_banda';

export const ESTADO_LABEL: Record<EstadoLab, string> = {
  optimo: 'En tu ventana',
  aceptable: 'Aceptable',
  atencion: 'Pide atención',
  sin_banda: 'Pendiente de rango',
};

/**
 * `value` llega en la unidad en que `lab_values` lo guardó, que no siempre es la
 * unidad en que la matriz escribió su ventana (la testosterona total se guarda en
 * ng/dL y la ventana está en ng/mL). Por eso el valor se lleva al espacio de la
 * ventana ANTES de puntuarlo. La conversión mira la magnitud, así que un valor
 * que ya venía en unidad de matriz pasa de largo.
 */
export function estadoDeParametro(sex: Sex, key: string, value: number): EstadoLab {
  const p = findMatrizParam(sex, key);
  if (!p) return 'sin_banda';
  const s = score9Bands(aUnidadDeMatriz(key, value), p.bandLimits);
  if (s == null) return 'sin_banda';
  if (s >= 100) return 'optimo';
  if (s >= 50) return 'aceptable';
  return 'atencion';
}

// ─────────────────────────────────────────────────────────────────────────────
// El resumen del panel
// ─────────────────────────────────────────────────────────────────────────────

export interface ResumenPanel {
  optimo: number;
  aceptable: number;
  atencion: number;
  sinBanda: number;
  /** Los que SÍ cuentan: los que tienen banda funcional. */
  evaluados: number;
  total: number;
}

export function resumirPanel(estados: EstadoLab[]): ResumenPanel {
  const r: ResumenPanel = { optimo: 0, aceptable: 0, atencion: 0, sinBanda: 0, evaluados: 0, total: estados.length };
  for (const e of estados) {
    if (e === 'optimo') r.optimo += 1;
    else if (e === 'aceptable') r.aceptable += 1;
    else if (e === 'atencion') r.atencion += 1;
    else r.sinBanda += 1;
  }
  r.evaluados = r.optimo + r.aceptable + r.atencion;
  return r;
}

/**
 * La frase del encabezado. Se escribe distinto cuando no hay nada fuera: ese
 * caso merece decirse, no quedarse en un conteo mudo.
 */
export function fraseResumen(r: ResumenPanel): string {
  if (r.total === 0) return 'Todavía no hay estudios que leer.';
  if (r.evaluados === 0) return `${r.total} parámetros cargados, ninguno con rango funcional definido todavía.`;
  if (r.atencion === 0 && r.aceptable === 0) return `Tus ${r.evaluados} parámetros con rango están en tu ventana.`;
  if (r.atencion === 0) return `Nada pide atención hoy. ${r.aceptable} están aceptables y podrían afinarse.`;
  return r.atencion === 1
    ? '1 parámetro pide atención. Empieza por ahí.'
    : `${r.atencion} parámetros piden atención. Empieza por ahí.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// El delta contra la medición anterior
// ─────────────────────────────────────────────────────────────────────────────

export type Rumbo = 'acerca' | 'aleja' | 'sostiene' | 'sin_cambio';

export interface DeltaLab {
  anterior: number;
  anteriorFecha: string;
  actual: number;
  /** Diferencia cruda, con signo. */
  delta: number;
  /** Cambio porcentual sobre el valor anterior. null si el anterior era cero. */
  pct: number | null;
  rumbo: Rumbo;
  /** Lo que se pinta. Habla de TU ventana, no de la dirección del número. */
  texto: string;
}

export interface PuntoSerie {
  value: number | null;
  measured_at: string;
}

/** Distancia a la ventana funcional. Cero si está dentro. */
export function distanciaAVentana(value: number, banda: { lo: number; hi: number } | null): number | null {
  if (!banda) return null;
  if (value < banda.lo) return banda.lo - value;
  if (value > banda.hi) return value - banda.hi;
  return 0;
}

function formatea(n: number): string {
  const abs = Math.abs(n);
  const dec = abs >= 10 ? 0 : abs >= 1 ? 1 : 2;
  return abs.toFixed(dec);
}

/**
 * Compara el último valor contra el anterior REAL de la serie.
 *
 * Regla dura: si solo hay una medición NO se inventa una comparación. La
 * primera vez es la primera vez, y decirlo es más honesto que dibujar una
 * flecha plana.
 *
 * `bandLimits` debe venir ya en las mismas unidades que la serie (las claves
 * porcentuales se convierten antes de llegar aquí).
 */
export function deltaVsAnterior(serie: PuntoSerie[], bandLimits: (number | null)[] | null): DeltaLab | null {
  const puntos = (serie ?? [])
    .filter((p): p is { value: number; measured_at: string } => p.value != null && Number.isFinite(p.value))
    .slice()
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  if (puntos.length < 2) return null;

  const actual = puntos[puntos.length - 1];
  const anterior = puntos[puntos.length - 2];
  const delta = actual.value - anterior.value;
  const pct = anterior.value !== 0 ? (delta / Math.abs(anterior.value)) * 100 : null;

  const lo = bandLimits?.[3] ?? null;
  const hi = bandLimits?.[4] ?? null;
  const banda = lo != null && hi != null ? { lo, hi } : null;
  const dAntes = distanciaAVentana(anterior.value, banda);
  const dAhora = distanciaAVentana(actual.value, banda);

  let rumbo: Rumbo = 'sin_cambio';
  let texto: string;
  const cambio = `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${formatea(delta)}`;

  if (dAntes == null || dAhora == null) {
    // Sin ventana no se puede decir si mejoró: solo se reporta el movimiento.
    rumbo = delta === 0 ? 'sin_cambio' : 'sostiene';
    texto = delta === 0
      ? `Igual que la medición anterior (${anterior.measured_at}).`
      : `${cambio} contra ${anterior.measured_at}. Sin rango funcional para decir si es mejor.`;
  } else if (dAhora === 0 && dAntes === 0) {
    rumbo = 'sostiene';
    texto = `Sigue dentro de tu ventana desde ${anterior.measured_at}.`;
  } else if (dAhora < dAntes) {
    rumbo = 'acerca';
    texto = dAhora === 0
      ? `Entró a tu ventana. Venías de ${formatea(anterior.value)} en ${anterior.measured_at}.`
      : `${cambio}: se acercó a tu ventana contra ${anterior.measured_at}.`;
  } else if (dAhora > dAntes) {
    rumbo = 'aleja';
    texto = dAntes === 0
      ? `Salió de tu ventana. En ${anterior.measured_at} estaba dentro.`
      : `${cambio}: se alejó de tu ventana contra ${anterior.measured_at}.`;
  } else {
    rumbo = 'sin_cambio';
    texto = `Sin cambio real contra ${anterior.measured_at}.`;
  }

  return {
    anterior: anterior.value,
    anteriorFecha: anterior.measured_at,
    actual: actual.value,
    delta,
    pct,
    rumbo,
    texto,
  };
}

/** Copy honesto para el caso de una sola medición. */
export const SIN_COMPARACION =
  'Es tu primera medición de este parámetro. Con la siguiente ya se puede comparar.';
