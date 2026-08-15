/**
 * Glucosa Report Core (NOCHE-REP) — lógica PURA del reporte de glucosa:
 * la serie en el tiempo, el resumen por contexto y el GKI día por día.
 *
 * NO SE ESCRIBE UN TERCER GKI. Ya había dos implementaciones en el repo con
 * constantes distintas (divisor 18 contra 18.016) y solo una con pruebas.
 * Sumar una tercera sería garantizar que la misma persona vea tres números
 * distintos del mismo día. Este core IMPORTA computeGKI y gkiZone de
 * fasting-metrics-core, que es la que está probada y la que ya tiene zonas.
 *
 * Y una línea que no se cruza: el GKI se reporta como PROFUNDIDAD DE CETOSIS.
 * Nunca como afirmación de que hubo autofagia. Esa regla está escrita en
 * fasting-metrics-core y hay una prueba que la vigila; aquí se hereda.
 */
import { computeGKI, gkiZone, type GkiZone } from '@/src/services/fasting-metrics-core';

// ── Entradas ─────────────────────────────────────────────────────────────

export interface GlucosaRow {
  date: string;
  time: string | null;
  value_mg_dl: number;
  context: string | null;
}

export interface CetonaRow {
  date: string;
  time: string | null;
  source: string | null;
  value_mmol: number | null;
  value_ppm: number | null;
  urine_level: string | null;
}

/** Etiquetas de contexto, en español de México. */
export const CONTEXTO_LABEL: Record<string, string> = {
  fasting: 'En ayuno',
  pre_meal: 'Antes de comer',
  post_meal_1h: '1 hora después de comer',
  post_meal_2h: '2 horas después de comer',
  bedtime: 'Antes de dormir',
  random: 'Sin contexto',
};

export function contextoLabel(raw: string | null | undefined): string {
  if (!raw) return CONTEXTO_LABEL.random;
  return CONTEXTO_LABEL[raw] ?? CONTEXTO_LABEL.random;
}

// ── Resumen numérico ─────────────────────────────────────────────────────

export interface Resumen {
  n: number;
  promedio: number;
  min: number;
  max: number;
}

/** Sin valores devuelve null: un promedio de nada es cero y cero miente. */
export function resumir(valores: readonly number[]): Resumen | null {
  const v = valores.filter((x) => Number.isFinite(x));
  if (v.length === 0) return null;
  const suma = v.reduce((a, b) => a + b, 0);
  return {
    n: v.length,
    promedio: Math.round((suma / v.length) * 10) / 10,
    min: Math.min(...v),
    max: Math.max(...v),
  };
}

export interface ResumenContexto {
  contexto: string;
  label: string;
  resumen: Resumen;
}

/**
 * Glucosa agrupada por contexto. El orden es el clínico (ayuno primero, luego
 * las post comida), no el alfabético: es como se lee un registro.
 */
const ORDEN_CONTEXTO = ['fasting', 'pre_meal', 'post_meal_1h', 'post_meal_2h', 'bedtime', 'random'];

export function porContexto(rows: readonly GlucosaRow[]): ResumenContexto[] {
  const acc = new Map<string, number[]>();
  for (const r of rows) {
    const k = r.context && CONTEXTO_LABEL[r.context] ? r.context : 'random';
    const lista = acc.get(k) ?? [];
    lista.push(r.value_mg_dl);
    acc.set(k, lista);
  }
  const salida: ResumenContexto[] = [];
  for (const k of ORDEN_CONTEXTO) {
    const v = acc.get(k);
    if (!v) continue;
    const resumen = resumir(v);
    if (resumen) salida.push({ contexto: k, label: contextoLabel(k), resumen });
  }
  return salida;
}

// ── Serie diaria ─────────────────────────────────────────────────────────

export interface PuntoDia {
  date: string;
  /** Promedio del día. */
  valor: number;
  lecturas: number;
}

export function promedioPorDia(rows: readonly { date: string; valor: number }[]): PuntoDia[] {
  const acc = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.date || !Number.isFinite(r.valor)) continue;
    const lista = acc.get(r.date) ?? [];
    lista.push(r.valor);
    acc.set(r.date, lista);
  }
  return [...acc.entries()]
    .map(([date, v]) => ({
      date,
      valor: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10,
      lecturas: v.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── GKI ──────────────────────────────────────────────────────────────────

export interface PuntoGki {
  date: string;
  glucosaMgDl: number;
  cetonasMmol: number;
  gki: number;
  zona: GkiZone;
}

/**
 * El GKI del día, y SOLO de los días que tienen las dos mediciones. Un día con
 * glucosa pero sin cetonas no produce un punto: el índice necesita las dos, y
 * rellenar la que falta con la del día anterior sería inventar una medición.
 *
 * Se emparejan los promedios del día, no la primera lectura de cada uno: si la
 * persona midió tres veces, el índice del día es el de sus tres.
 */
export function serieGki(
  glucosa: readonly GlucosaRow[],
  cetonas: readonly CetonaRow[],
): PuntoGki[] {
  const gDias = promedioPorDia(glucosa.map((r) => ({ date: r.date, valor: r.value_mg_dl })));
  const sangre = cetonas.filter((c) => (c.source ?? 'blood') === 'blood' && c.value_mmol != null);
  const cDias = promedioPorDia(sangre.map((c) => ({ date: c.date, valor: c.value_mmol as number })));
  const porFecha = new Map(cDias.map((d) => [d.date, d.valor]));

  const salida: PuntoGki[] = [];
  for (const g of gDias) {
    const cet = porFecha.get(g.date);
    if (cet == null) continue;
    const valor = computeGKI(g.valor, cet, 'mgdl');
    if (valor == null) continue;
    salida.push({
      date: g.date,
      glucosaMgDl: g.valor,
      cetonasMmol: cet,
      gki: valor,
      zona: gkiZone(valor),
    });
  }
  return salida;
}

/**
 * Cuántos días del rango se quedaron sin índice por faltarles una de las dos
 * mediciones. Es lo que le dice a la persona QUÉ le falta para tener la serie
 * completa, en vez de dejarle una gráfica con huecos sin explicación.
 */
export interface HuecoGki {
  diasConGlucosa: number;
  diasConCetonas: number;
  diasConAmbas: number;
  /** Días con glucosa a los que solo les faltó anotar cetonas. */
  soloFaltaCetonas: number;
}

export function huecosGki(
  glucosa: readonly GlucosaRow[],
  cetonas: readonly CetonaRow[],
): HuecoGki {
  const g = new Set(glucosa.map((r) => r.date).filter(Boolean));
  const c = new Set(
    cetonas.filter((x) => (x.source ?? 'blood') === 'blood' && x.value_mmol != null)
      .map((x) => x.date).filter(Boolean),
  );
  let ambas = 0;
  for (const d of g) if (c.has(d)) ambas += 1;
  return {
    diasConGlucosa: g.size,
    diasConCetonas: c.size,
    diasConAmbas: ambas,
    soloFaltaCetonas: g.size - ambas,
  };
}

/** Lo que le falta a la serie, dicho en una línea. null si está completa. */
export function copyHuecoGki(h: HuecoGki): string | null {
  if (h.diasConGlucosa === 0 && h.diasConCetonas === 0) {
    return 'El índice necesita glucosa y cetonas del mismo día. Todavía no hay ninguna de las dos en este rango.';
  }
  if (h.diasConAmbas === 0) {
    return h.diasConGlucosa > 0
      ? 'Tienes glucosa pero no cetonas del mismo día. El índice sale de las dos juntas, y con una sola no se puede calcular.'
      : 'Tienes cetonas pero no glucosa del mismo día. El índice sale de las dos juntas, y con una sola no se puede calcular.';
  }
  if (h.soloFaltaCetonas > 0) {
    return `${h.soloFaltaCetonas} ${h.soloFaltaCetonas === 1 ? 'día quedó' : 'días quedaron'} fuera del índice por no tener cetonas de sangre. Se miden el mismo día, no importa la hora.`;
  }
  return null;
}

export { type GkiZone };
