/**
 * argos-labs-core — el expediente de laboratorio COMPRIMIDO para el cerebro de
 * ARGOS. Núcleo PURO: sin supabase, sin React, testeable con node.
 *
 * POR QUÉ EXISTE
 * El dueño preguntó "llevo años suplementando magnesio y sigue saliendo bajo,
 * qué hago" y ARGOS contestó que no podía ver un solo valor de sus labs. Tenía
 * 244 mediciones en 60 parámetros en la base. El contexto leía `lab_results`,
 * la tabla ancha vieja de once columnas fijas, con `.limit(1)`. Magnesio no es
 * una de las once, y `.limit(1)` es un solo día. La pregunta era imposible de
 * contestar: no por falta de datos, sino porque el contexto miraba al lugar
 * equivocado y sin profundidad.
 *
 * Aquí NO se lee nada ni se calcula ningún rango. La historia por parámetro ya
 * la construye `labs-report-core.construirHistorias` contra la matriz V7/V6, y
 * la fase del ciclo ya la resuelve `lab-cycle-context-core`. Este archivo hace
 * UNA cosa: decidir qué de todo eso cabe en el cerebro y cómo se redacta.
 *
 * CERO RANGOS INVENTADOS. Las ventanas vienen de la matriz, ya resueltas en
 * `HistoriaLab.ventana`. Un parámetro sin banda se declara "pendiente de rango"
 * y no se le adjudica un número de referencia de ningún lado.
 *
 * EL PRESUPUESTO, Y POR QUÉ ASÍ
 * El cerebro va en caché de una hora y pesa ~26,000 tokens. Volcar las 244
 * mediciones crudas costaría del orden de 8,000 tokens (~31% más caro por
 * llamada) para decir noventa veces lo mismo. Pero recortar a "solo lo que está
 * fuera de rango" reintroduce el bug original con otra cara: el magnesio del
 * dueño podría estar DENTRO de su ventana y volvería a ser invisible, y él
 * volvería a recibir un "no tengo ese dato" falso.
 *
 * La salida intermedia: TODO parámetro aparece por nombre, siempre — así ARGOS
 * nunca puede afirmar que un biomarcador no existe cuando sí está cargado — y
 * solo los primeros `MAX_PARAMS_DETALLE` (ordenados por `ordenarHistorias`, que
 * ya pone al frente lo que pide atención) traen valor, ventana y serie. El
 * resto viaja como lista de nombres, que cuesta ~3 tokens cada uno.
 *
 * LA REGLA DURA QUE VIAJA PEGADA AL DATO
 * Un "no sé" es recuperable; un dato incompleto dicho con confianza no. Por eso
 * el bloque cierra declarando explícitamente que la lista es el expediente
 * completo y que lo que no aparece no está cargado. Sin esa línea, un modelo
 * que ve 40 parámetros detallados asume que ésos son todos y responde con
 * seguridad sobre un universo recortado.
 */
import type { HistoriaLab, ResumenLabs } from '@/src/services/reports/labs-report-core';

// ── Presupuesto ──────────────────────────────────────────────────────────

/**
 * Cuántos parámetros llevan detalle completo (valor, ventana, serie, rumbo).
 * 40 cubre con holgura el expediente del usuario más cargado que existe hoy en
 * la base (60 parámetros) dejando solo los 20 más quietos como nombre suelto.
 */
export const MAX_PARAMS_DETALLE = 40;

/**
 * Cuántos puntos de la serie se muestran por parámetro. Se conservan los más
 * RECIENTES, salvo el primero de todos, que se mantiene siempre: la pregunta
 * "llevo años con esto" se contesta con el punto más viejo y el más nuevo, y
 * perder el ancla del inicio es perder la premisa de la pregunta.
 */
export const MAX_PUNTOS_SERIE = 6;

// ── Salida ───────────────────────────────────────────────────────────────

export interface BloqueLabs {
  /** Líneas listas para concatenar al prompt, en orden. */
  lineas: string[];
  /** Cuántos parámetros llevan detalle completo. */
  detallados: number;
  /** Cuántos viajan solo como nombre. */
  soloNombre: number;
}

const RUMBO_TEXTO: Record<HistoriaLab['rumbo'], string> = {
  acerca: 'se acercó a su ventana',
  aleja: 'se alejó de su ventana',
  sostiene: 'se sostuvo',
  sin_comparacion: 'primera medición',
};

/** `2026-06-12` → `2026-06`. La serie se lee por mes, el día no aporta. */
export function mesDe(fechaISO: string): string {
  return fechaISO.slice(0, 7);
}

/**
 * Recorta la serie a `max` puntos conservando SIEMPRE el primero y los más
 * recientes. Con recorte se inserta un marcador de hueco para que el modelo no
 * lea la serie como si fuera continua.
 */
export function recortarSerie<T>(puntos: readonly T[], max: number = MAX_PUNTOS_SERIE): {
  visibles: T[];
  omitidos: number;
} {
  if (puntos.length <= max) return { visibles: [...puntos], omitidos: 0 };
  const primero = puntos[0];
  const cola = puntos.slice(puntos.length - (max - 1));
  return { visibles: [primero, ...cola], omitidos: puntos.length - max };
}

function num(n: number): string {
  const abs = Math.abs(n);
  const dec = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return Number(n.toFixed(dec)).toString();
}

/** La serie en una línea: `1.85(2023-09) 1.81(2024-11) … 1.97(2026-06)`. */
export function serieCompacta(h: HistoriaLab): string {
  const { visibles, omitidos } = recortarSerie(h.puntos);
  const trozos = visibles.map((p) => `${num(p.value)}(${mesDe(p.measured_at)})`);
  if (omitidos > 0) trozos.splice(1, 0, `…${omitidos} más…`);
  return trozos.join(' ');
}

/**
 * La línea de un parámetro con detalle. Formato denso a propósito: cada token
 * de este bloque se paga en cada llamada durante la hora de caché.
 */
export function lineaDetalle(h: HistoriaLab): string {
  const unidad = h.unidad ? ` ${h.unidad}` : '';
  const partes: string[] = [`${h.nombre} ${num(h.ultimo.value)}${unidad}`];

  partes.push(
    h.ventana
      ? `ventana ${num(h.ventana.lo)}-${num(h.ventana.hi)}`
      : 'pendiente de rango funcional',
  );
  partes.push(h.estadoLabel.toLowerCase());

  if (h.puntos.length > 1) {
    partes.push(`${h.puntos.length} mediciones: ${serieCompacta(h)}`);
    partes.push(RUMBO_TEXTO[h.rumbo]);
  } else {
    partes.push(`medición única ${mesDe(h.ultimo.measured_at)}`);
  }

  // La fase del ciclo es doctrina de la casa: un marcador hormonal de mujer sin
  // fase es un dato incompleto, y callarlo es peor que declararlo.
  if (h.ciclo.show && h.ciclo.note) partes.push(h.ciclo.note);

  return `- ${partes.join(' · ')}`;
}

/**
 * Arma el bloque completo. `historias` debe venir ya ordenada por
 * `ordenarHistorias` (atención primero); no se reordena aquí para no tener dos
 * criterios de orden compitiendo.
 */
export function construirBloqueLabs(
  historias: readonly HistoriaLab[],
  resumen: ResumenLabs,
  maxDetalle: number = MAX_PARAMS_DETALLE,
): BloqueLabs | null {
  if (historias.length === 0) return null;

  const detalle = historias.slice(0, Math.max(0, maxDetalle));
  const resto = historias.slice(detalle.length);

  const fechas = historias.flatMap((h) => h.puntos.map((p) => p.measured_at)).sort();
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  const lineas: string[] = [];
  lineas.push(
    `LABS — expediente completo: ${resumen.parametros} biomarcadores, ` +
    `${resumen.mediciones} mediciones, de ${desde} a ${hasta}. ` +
    `${resumen.conHistoria} tienen dos o más mediciones. ` +
    'Las ventanas funcionales salen de la matriz V7/V6 de la casa; ' +
    'un parámetro sin banda se reporta como pendiente de rango y no se le inventa una.',
  );

  for (const h of detalle) lineas.push(lineaDetalle(h));

  if (resto.length > 0) {
    lineas.push(
      `Cargados también, sin serie en este contexto (${resto.length}): ` +
      `${resto.map((h) => h.nombre).join(', ')}. ` +
      'Si necesitas la serie de alguno, pídesela al cliente por pantalla de labs.',
    );
  }

  lineas.push(
    'REGLA LABS (obligatoria): la lista de arriba es el expediente COMPLETO de biomarcadores ' +
    'de este cliente. Si te preguntan por uno que no aparece, no está cargado: dilo así y di ' +
    'cómo subirlo. Nunca afirmes un valor, una tendencia ni un "sigue igual" que no esté ' +
    'sostenido por la serie de arriba. Si la serie tiene un hueco marcado, no lo rellenes.',
  );

  return { lineas, detallados: detalle.length, soloNombre: resto.length };
}
