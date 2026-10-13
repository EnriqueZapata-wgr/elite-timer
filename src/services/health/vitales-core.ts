/**
 * Vitales core (wearables, bloque A, 13-oct-2026): el lector de DÍAS de
 * health_os_daily, puro.
 *
 * POR QUÉ EXISTE
 * Con la migración 344, health_os_daily guarda por día HRV (RMSSD y, aparte,
 * SDNN de Salud de Apple), FC en reposo, respiración, desviación de
 * temperatura, SpO2 y el score de recuperación de la marca, cada campo con su
 * fuente en `field_sources`. Hasta hoy nadie los leía. Este núcleo arma, por
 * métrica: el último valor con su fecha y su procedencia (fuente, método,
 * si aplica el rango de la casa) y la tendencia calculada SOLO dentro del
 * tramo de la misma fuente.
 *
 * REGLAS QUE VIVEN AQUÍ
 *  · HRV RMSSD (hrv_ms) y HRV SDNN (hrv_sdnn_ms) son dos métricas distintas.
 *    Nunca se mezclan ni se comparan entre sí.
 *  · Una tendencia no cruza fuentes: si la fuente cambió, la línea se corta y
 *    se dice desde cuándo y qué había antes (procedencia-core).
 *  · Con menos de 4 puntos en el tramo, la tendencia "no se calcula". No es
 *    'estable': estable es una afirmación y con 3 puntos no se puede hacer.
 *  · Umbrales de "estable": son DATO (cuánto se tiene que mover un número
 *    para no llamarle ruido), no juicio clínico. Ver UMBRALES_VITALES.
 *  · 'mixto' en field_sources = el teléfono escribió sin decir su fuente. Se
 *    reporta tal cual, pero para la tendencia cuenta como fuente desconocida:
 *    dos días 'mixto' pueden venir de aparatos distintos y no se juntan.
 *
 * PURO: sin red ni fechas del sistema. La capa con I/O es vitales-service.ts.
 */

import {
  fuenteDelCampo,
  procedenciaDe,
  tramoMismaFuente,
  type CampoConProcedencia,
  type MetodoHrv,
  type PuntoSerie,
} from './procedencia-core';

// ── Tendencia dentro del tramo de una sola fuente ──

/** Mínimo de puntos de la MISMA fuente para hablar de tendencia. */
export const MIN_PUNTOS_TENDENCIA = 4;

export type DireccionTendencia = 'sube' | 'baja' | 'estable' | 'no_se_calcula';

/**
 * Cuánto se tiene que mover la mitad reciente contra la mitad vieja para no
 * llamarle ruido. 'absoluto' en la unidad de la métrica; 'relativo' como
 * fracción del promedio viejo (0.05 = 5 %).
 */
export interface UmbralEstable {
  tipo: 'absoluto' | 'relativo';
  valor: number;
}

export interface Tendencia {
  direccion: DireccionTendencia;
  /** Puntos del tramo de la misma fuente (los que se usaron, o los que no alcanzaron). */
  puntos: number;
  /** Fuente del tramo (literal de la base) o null si no se sabe. */
  fuente: string | null;
  /** true si antes del tramo había días de OTRA fuente: la línea se cortó. */
  cortada: boolean;
  /** Fecha del punto más viejo del tramo: desde cuándo se compara. */
  desde: string | null;
  /** Fuente de justo antes del corte. null si no se cortó (o si no se sabe cuál era). */
  fuenteAnterior: string | null;
}

/**
 * Tendencia de una serie (de la fecha más nueva a la más vieja) SOLO dentro
 * del tramo reciente de una sola fuente. Método: promedio de la mitad
 * reciente contra la mitad vieja del tramo (el mismo que ARGOS ya usaba para
 * el sueño). Se mueve igual o más que el umbral: sube o baja; menos: estable.
 */
export function tendenciaEnTramo(serie: readonly PuntoSerie[], umbral: UmbralEstable): Tendencia {
  const tramo = tramoMismaFuente(serie);
  const base = {
    puntos: tramo.puntos.length,
    fuente: tramo.fuente,
    cortada: tramo.cortada,
    desde: tramo.desde,
    fuenteAnterior: tramo.fuenteAnterior,
  };
  if (tramo.puntos.length < MIN_PUNTOS_TENDENCIA) return { direccion: 'no_se_calcula', ...base };
  const valores = tramo.puntos.map((p) => p.valor);
  const mitad = Math.floor(valores.length / 2);
  const promedio = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const recientes = promedio(valores.slice(0, mitad));
  const viejas = promedio(valores.slice(-mitad));
  const limite = umbral.tipo === 'relativo' ? Math.abs(viejas) * umbral.valor : umbral.valor;
  // Redondeo a 6 decimales para que 7.5 - 7.0 no salga 0.4999999.
  const diff = Math.round((recientes - viejas) * 1e6) / 1e6;
  let direccion: DireccionTendencia = 'estable';
  if (diff >= limite && diff !== 0) direccion = 'sube';
  else if (-diff >= limite && diff !== 0) direccion = 'baja';
  return { direccion, ...base };
}

/**
 * 'mixto' en un campo = el teléfono escribió sin decir su fuente. Para cortar
 * tramos cuenta como desconocida (null): no se junta con nada.
 */
export function fuenteParaTramo(fuente: string | null | undefined): string | null {
  return typeof fuente === 'string' && fuente !== '' && fuente !== 'mixto' ? fuente : null;
}

// ── Métricas del día ──

export type ClaveVital =
  | 'hrv_rmssd' | 'hrv_sdnn' | 'fc_reposo' | 'respiracion' | 'temp_desviacion' | 'spo2' | 'readiness';

/**
 * Qué columna lee cada métrica y su umbral de "estable". Documentados:
 *  · HRV (RMSSD y SDNN, cada una con la suya): ±5 % del promedio viejo. La
 *    HRV varía mucho de un día a otro; menos de 5 % es ruido.
 *  · FC en reposo: ±2 lpm.
 *  · Respiración: ±0.5 respiraciones por minuto.
 *  · Desviación de temperatura de piel: ±0.2 °C.
 *  · SpO2: ±1 punto porcentual.
 *  · Score de recuperación de la marca: ±5 puntos de su escala 0-100.
 */
export const METRICAS_VITALES: readonly { clave: ClaveVital; campo: CampoConProcedencia; umbral: UmbralEstable }[] = [
  { clave: 'hrv_rmssd', campo: 'hrv_ms', umbral: { tipo: 'relativo', valor: 0.05 } },
  { clave: 'hrv_sdnn', campo: 'hrv_sdnn_ms', umbral: { tipo: 'relativo', valor: 0.05 } },
  { clave: 'fc_reposo', campo: 'resting_hr', umbral: { tipo: 'absoluto', valor: 2 } },
  { clave: 'respiracion', campo: 'breath_rate', umbral: { tipo: 'absoluto', valor: 0.5 } },
  { clave: 'temp_desviacion', campo: 'temp_deviation_c', umbral: { tipo: 'absoluto', valor: 0.2 } },
  { clave: 'spo2', campo: 'spo2_pct', umbral: { tipo: 'absoluto', valor: 1 } },
  { clave: 'readiness', campo: 'readiness_score', umbral: { tipo: 'absoluto', valor: 5 } },
];

/** Columnas de health_os_daily que lee el lector de días (344). Sin `hypnogram` ni nada de sueño. */
export const SELECT_VITALES =
  'date, hrv_ms, hrv_sdnn_ms, resting_hr, breath_rate, temp_deviation_c, spo2_pct, readiness_score, source, field_sources';

/** Fila de health_os_daily tal como la pide SELECT_VITALES. */
export interface FilaVitales {
  date: string;
  hrv_ms?: number | string | null;
  hrv_sdnn_ms?: number | string | null;
  resting_hr?: number | string | null;
  breath_rate?: number | string | null;
  temp_deviation_c?: number | string | null;
  spo2_pct?: number | string | null;
  readiness_score?: number | string | null;
  source?: string | null;
  field_sources?: unknown;
}

export interface MetricaVital {
  clave: ClaveVital;
  /** Último valor con dato (tal cual: aquí no se corrige ni se redondea). */
  valor: number;
  /** Fecha (YYYY-MM-DD) de ese último valor. */
  fecha: string;
  /** Fuente de ese valor, literal de la base ('oura', 'healthkit', 'mixto'...). */
  fuente: string | null;
  /** 'rmssd' en hrv_rmssd, 'sdnn' en hrv_sdnn, null en lo demás. */
  metodo: MetodoHrv | null;
  /** ¿Se puede comparar contra el rango de la casa? (procedencia-core) */
  aplicaRangoCasa: boolean;
  tendencia: Tendencia;
}

/**
 * Las columnas numeric (respiración, temperatura, SpO2) pueden llegar como
 * texto según el cliente. Se aceptan número o texto numérico; lo demás es
 * "sin dato", nunca cero.
 */
export function numeroDeColumna(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Por métrica: último valor, su procedencia y la tendencia dentro del tramo
 * de la misma fuente. Solo salen las métricas con al menos un valor. Las
 * filas pueden llegar en cualquier orden; aquí se ordenan de la más nueva a
 * la más vieja. Una fecha repetida se toma una sola vez (la primera).
 */
export function resumirVitales(filas: readonly FilaVitales[]): MetricaVital[] {
  const vistas = new Set<string>();
  const ordenadas = [...filas]
    .filter((f) => {
      if (!f || !f.date || vistas.has(f.date)) return false;
      vistas.add(f.date);
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const salida: MetricaVital[] = [];
  for (const m of METRICAS_VITALES) {
    const conFuente = ordenadas.map((f) => ({
      fecha: f.date,
      valor: numeroDeColumna((f as unknown as Record<string, unknown>)[m.campo]),
      fuente: fuenteDelCampo(f.field_sources, m.campo, f.source),
    }));
    const ultimo = conFuente.find((p) => p.valor !== null);
    if (!ultimo || ultimo.valor === null) continue;
    const proc = procedenciaDe(m.campo, ultimo.fuente);
    const serie: PuntoSerie[] = conFuente.map((p) => ({ fecha: p.fecha, valor: p.valor, fuente: fuenteParaTramo(p.fuente) }));
    salida.push({
      clave: m.clave,
      valor: ultimo.valor,
      fecha: ultimo.fecha,
      fuente: proc.fuente,
      metodo: proc.metodo,
      aplicaRangoCasa: proc.aplicaRangoCasa,
      tendencia: tendenciaEnTramo(serie, m.umbral),
    });
  }
  return salida;
}
