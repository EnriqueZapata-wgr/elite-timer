/**
 * Estadísticas de ayuno — núcleo PURO (28-ago-2026).
 *
 * Encargo de Enrique: "no me está dando estadísticas rápidas acerca de mis
 * ayunos, mi promedio de ayunos, mi ayuno más largo, etcétera."
 *
 * Vive aparte de fasting-metrics-core.ts a propósito: ese archivo, pese al
 * nombre, es SOLO GKI, cetosis y flexibilidad metabólica. No tiene promedio, ni
 * máximo, ni racha. Mezclarlos habría metido estas cuentas bajo las pruebas de
 * aquél sin razón.
 *
 * Un solo import, y de otro núcleo puro (fasting-cumplido-core): se sigue
 * probando en node sin arrastrar react-native ni supabase.
 *
 * ── HIGIENE DE DATOS, y por qué no es opcional ──────────────────────────────
 * Medido contra la base real el 28-ago: 57 filas, 3 usuarios. Hay un ayuno de
 * 263.4 h (imposible: la propia app auto-cierra a 120) y cuatro de 0 h. Con esa
 * basura dentro, la media sale en 23.75 h mientras la mediana real es 15.75.
 * Enseñar "tu promedio: 23.8 h" sería mentir, y enseñar "tu ayuno más largo:
 * 263 h" es además irresponsable en una app de salud. Por eso se filtra ANTES
 * de contar, con el mismo tope que la app ya declara como política.
 */

import { diaCanonico } from './fasting-cumplido-core';

/** El auto-cierre de la app ocurre a las 120 h: nada por encima es un ayuno real. */
export const MAX_HORAS_VALIDAS = 120;
/** Un ayuno de 0 h no es un ayuno: es un registro fallido. */
export const MIN_HORAS_VALIDAS = 0.1;

export interface AyunoLike {
  /** Horas reales del ayuno. null en los cancelados y en el activo. */
  actual_hours: number | null;
  /** 'completed' | 'cancelled' | 'active'. Nullable en el esquema. */
  status?: string | null;
  /** Día local de INICIO, 'YYYY-MM-DD', como lo escribe el servicio. */
  date?: string | null;
  /** 31-ago-2026: con timestamps, el día de la racha es el de FIN (diaCanonico). */
  fast_start?: string | Date | null;
  fast_end?: string | Date | null;
}

export interface EstadisticasAyuno {
  /** Cuántos ayunos válidos alimentan estas cuentas. 0 = no hay nada que decir. */
  total: number;
  /** Promedio de horas, un decimal. null si no hay datos. */
  promedio: number | null;
  /** Mediana, un decimal. Con pocos datos y un outlier, es más honesta. */
  mediana: number | null;
  /** El ayuno más largo, ya filtrado. null si no hay datos. */
  masLargo: number | null;
  /** Días consecutivos con al menos un ayuno válido. Ver nota de definición. */
  racha: number;
  /** Cuántas filas se descartaron por basura. Para poder decirlo si hace falta. */
  descartados: number;
}

/** Un ayuno cuenta si está completado y sus horas caen en rango fisiológico. */
export function esAyunoValido(a: AyunoLike): boolean {
  if (a.status != null && a.status !== 'completed') return false;
  const h = a.actual_hours;
  if (h == null || !Number.isFinite(h)) return false;
  return h >= MIN_HORAS_VALIDAS && h <= MAX_HORAS_VALIDAS;
}

/**
 * DEFINICIÓN DE RACHA, escrita a propósito porque el backlog ya advierte de
 * "seis definiciones distintas de cumplí mi ayuno" y no queremos la séptima:
 *
 *   Días CONSECUTIVOS con al menos un ayuno válido, contando hacia atrás desde
 *   hoy. Si hoy todavía no ayunas pero ayer sí, la racha sigue viva: se rompe
 *   al saltarse un día completo, no al no haber ayunado todavía hoy.
 *
 * Deliberadamente NO usa "alcanzó su meta": esa es justo la pregunta con seis
 * respuestas distintas en la app. Aquí un ayuno cuenta o no cuenta, y ya.
 *
 * DÍA (31-ago-2026, decisión 15.1 del backlog): "día" es el día canónico del
 * ayuno, que es el día local en que TERMINA (ver diaCanonico en
 * fasting-cumplido-core: ahí están las razones y ahí se revierte). Antes era
 * el día de inicio, porque así se escribe la columna `date`, y con 16:8
 * nocturno el ayuno de anoche se pintaba en ayer mientras HOY lo daba por
 * cumplido hoy. Las filas sin timestamps (pruebas viejas, filas corruptas)
 * siguen cayendo a `date`.
 *
 * SALVEDAD que queda: un ayuno de 48 h marca UN día (el de fin), no los que
 * atravesó. Contar los días que un ayuno prolongado cubre es otra definición
 * de racha, y esa sí queda pendiente con Enrique.
 *
 * Si Enrique prefiere otra definición, se cambia esta función y nada más.
 */
export function calcularRacha(ayunos: AyunoLike[], hoy: string): number {
  const dias = new Set<string>();
  for (const a of ayunos) {
    if (!esAyunoValido(a)) continue;
    const dia = diaCanonico(a);
    if (dia) dias.add(dia);
  }
  if (dias.size === 0) return 0;

  // El ancla es hoy si hoy hay ayuno; si no, ayer. Más atrás, la racha ya murió.
  let cursor = hoy;
  if (!dias.has(cursor)) {
    const ayer = correrDias(hoy, -1);
    if (!dias.has(ayer)) return 0;
    cursor = ayer;
  }

  let racha = 0;
  while (dias.has(cursor)) {
    racha++;
    cursor = correrDias(cursor, -1);
  }
  return racha;
}

/** Suma n días a 'YYYY-MM-DD' sin tocar husos horarios. */
function correrDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function calcularEstadisticas(ayunos: AyunoLike[], hoy: string): EstadisticasAyuno {
  const validos = ayunos.filter(esAyunoValido);
  const descartados = ayunos.length - validos.length;

  if (validos.length === 0) {
    return { total: 0, promedio: null, mediana: null, masLargo: null, racha: 0, descartados };
  }

  const horas = validos.map((a) => a.actual_hours as number).sort((x, y) => x - y);
  const suma = horas.reduce((s, h) => s + h, 0);
  const medio = Math.floor(horas.length / 2);
  const mediana = horas.length % 2 === 1
    ? horas[medio]
    : (horas[medio - 1] + horas[medio]) / 2;

  const red = (v: number) => Math.round(v * 10) / 10;

  return {
    total: validos.length,
    promedio: red(suma / horas.length),
    mediana: red(mediana),
    masLargo: red(horas[horas.length - 1]),
    racha: calcularRacha(ayunos, hoy),
    descartados,
  };
}

/** '16.5 h' · '—' cuando no hay dato. La UI nunca pinta un 0 falso. */
export function formatearHoras(v: number | null): string {
  if (v == null) return '—';
  return `${v} h`;
}
