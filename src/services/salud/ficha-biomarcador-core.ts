/**
 * ficha-biomarcador-core — la ficha de UN biomarcador. Núcleo PURO: sin I/O,
 * sin React, testeable con node.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ SE TOMÓ DE LA REFERENCIA Y QUÉ SE RECHAZÓ
 *
 * Se investigó cómo resuelve la ficha por biomarcador la empresa de análisis de
 * sangre que puso el dueño de referencia. Tres cosas suyas valen y entran:
 *
 *   1. LA PLANTILLA DE "QUÉ SIGNIFICA MI RESULTADO" EN BLOQUES. No un párrafo
 *      genérico: el bloque que toca según dónde cayó TU número, más un bloque
 *      aparte de qué altera la lectura del estudio. Ese último bloque es el que
 *      evita que alguien lea como basal un valor tomado después de entrenar.
 *   2. MARCADORES RELACIONADOS, ETIQUETADOS. Desde la ficha se salta a los que
 *      se leen junto con este. Aquí la relación no se inventa: sale de los
 *      cruces que ya tiene el motor de "Mi lectura", que son los que un clínico
 *      funcional de la casa ya validó.
 *   3. EL SEMÁFORO DE TRES ESTADOS CON VENTANA ÓPTIMA SEPARADA DE LA NORMAL. Ya
 *      existía en el panel; aquí se hereda tal cual en lugar de abrir un segundo
 *      criterio.
 *
 * Y dos cosas suyas se rechazan a conciencia:
 *
 *   1. PINTAR EN ROJO RAZONES CALCULADAS COMO SI FUERAN HALLAZGOS PROPIOS. Es la
 *      crítica que más les repiten en prensa, con una demanda de un competidor
 *      de por medio y con casos documentados de alarmar a personas sanas a
 *      partir de dos valores normales combinados. Aquí un marcador derivado se
 *      declara derivado, se lee como resumen de sus bases y NUNCA levanta una
 *      alarma por su cuenta: la ficha manda a las piezas que lo forman.
 *   2. DEJAR QUE LA IA SEA LA QUE DESMIENTE LA ALARMA QUE LA PROPIA APP LEVANTÓ.
 *      El filtro de convergencia corre ANTES, por código determinista, con el
 *      mismo predicado que usa "Mi lectura" (`cumple`). Si un marcador está
 *      fuera de ventana y ninguno de su grupo lo acompaña, la ficha lo dice de
 *      frente en vez de encender un foco rojo y luego pedir perdón.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOCTRINA QUE ESTE MÓDULO SOSTIENE
 *  · Un dato vive en un solo lugar. La ficha interpreta y enlaza; no vuelve a
 *    listar el panel ni repite la lectura cruzada, manda a ellos.
 *  · Rangos funcionales de la matriz V7/V6, nunca inventados. Sin banda, el
 *    parámetro sale como "pendiente de rango" y no cuenta ni para bien ni para
 *    mal.
 *  · Los labs de mujeres se leen con la fase del ciclo como contexto.
 *  · Nunca alarmar por un marcador solo.
 *  · Estados honestos: si falta la ficha escrita o falta una segunda medición,
 *    se dice qué falta y cómo conseguirlo.
 */
import { findMatrizParam, findMatrizDomain } from '@/src/constants/edad-atp-matriz-lookup';
import { bandLimitsEnEspacioDe } from '@/src/constants/lab-unidades-core';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import {
  estadoDeParametro, deltaVsAnterior, ESTADO_LABEL, SIN_COMPARACION,
  type EstadoLab, type DeltaLab, type PuntoSerie,
} from '@/src/services/edad-atp/labs-premium-core';
import { REGLAS_CRUCE, leerParametro, cumple, type Direccion, type Señal } from '@/src/services/salud/lectura-core';
import { deriveLabCycleContext, isCycleSensitiveMarker, type LabCycleContext } from '@/src/services/salud/lab-cycle-context-core';
import { contenidoDe, type ContenidoBiomarcador } from '@/src/constants/biomarcador-contenido';
import type { Sex } from '@/src/types/edad-atp-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Entrada
// ─────────────────────────────────────────────────────────────────────────────

export interface EntradaFicha {
  sexo: Sex;
  /** Clave canónica del parámetro que se está abriendo. */
  key: string;
  /** Último valor, en la unidad en que `lab_values` lo guardó. */
  valor: number;
  medidoEn: string;
  /** Etiqueta legible de la fuente ("PDF de lab", "Manual"…). */
  fuenteLabel: string;
  /** El último valor tiene más de un año. */
  vencido: boolean;
  /** Serie histórica del parámetro, ya en el espacio en que se pinta. */
  serie: PuntoSerie[];
  /**
   * TODOS los últimos valores del expediente, clave canónica → valor guardado.
   * Se necesitan para juzgar convergencia: sin el resto del panel no se puede
   * saber si este marcador está solo o acompañado.
   */
  panel: Record<string, number>;
  /** Fase del ciclo de hoy, o null. */
  faseCiclo: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Salida
// ─────────────────────────────────────────────────────────────────────────────

export interface RelacionadoFicha {
  key: string;
  label: string;
  /** null = la persona no tiene ese parámetro medido todavía. */
  estado: EstadoLab | null;
  /** Por qué se relacionan: el titular del cruce que los une. */
  porque: string;
}

export type Convergencia =
  /** El marcador no está en atención: no hay nada que moderar. */
  | { tipo: 'sin_alarma'; texto: string }
  /** Es un derivado. No levanta hallazgo propio; manda a sus bases. */
  | { tipo: 'derivado'; texto: string }
  /** Está fuera y nadie de su grupo lo acompaña. Es ruido, no hallazgo. */
  | { tipo: 'solo'; texto: string }
  /** Está fuera y hay compañía. Eso sí es un patrón, y vive en Mi lectura. */
  | { tipo: 'converge'; texto: string; acompanantes: string[]; ruta: string }
  /** No participa en ningún cruce, así que no se puede juzgar convergencia. */
  | { tipo: 'sin_grupo'; texto: string };

export interface FichaBiomarcador {
  key: string;
  label: string;
  abbr: string;
  unidad: string | null;
  /** Nombre del panel de la matriz al que pertenece ("Cardiovascular"…). */
  panelNombre: string;
  valor: number;
  medidoEn: string;
  fuenteLabel: string;
  vencido: boolean;
  estado: EstadoLab;
  estadoLabel: string;
  direccion: Direccion;
  /** Ventana funcional en la MISMA unidad que el valor mostrado. */
  ventana: { lo: number; hi: number } | null;
  /** La línea corta del catálogo. Fuente única, no se reescribe aquí. */
  resumen: string;
  /** El contenido escrito, o null si esta clave todavía no tiene ficha. */
  contenido: ContenidoBiomarcador | null;
  /** El bloque de "qué significa TU número": el párrafo que te toca. */
  lectura: string | null;
  convergencia: Convergencia;
  relacionados: RelacionadoFicha[];
  delta: DeltaLab | null;
  /** Copy honesto cuando solo hay una medición. null si sí hay delta. */
  sinComparacion: string | null;
  ciclo: LabCycleContext;
  /** Qué le falta a esta ficha para estar completa. Nunca pantalla muda. */
  huecos: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Piezas
// ─────────────────────────────────────────────────────────────────────────────

/** Valor tal como se pinta: las claves porcentuales se enseñan en %. */
export function valorParaMostrar(key: string, value: number): number {
  const v = CANONICAL_PCT_KEYS.has(key) ? decimalToPct(value) : value;
  return Math.round(v * 100) / 100;
}

/**
 * La ventana funcional llevada al espacio en que se PINTA el valor. Reusa el
 * mismo camino que la gráfica del panel: primero a la unidad del propio valor,
 * después a porcentaje si la clave es porcentual. Comparar crudo es justo el
 * bug que ya se cerró en el ciclo anterior.
 */
export function ventanaParaMostrar(sexo: Sex, key: string, valorMostrado: number): { lo: number; hi: number } | null {
  const p = findMatrizParam(sexo, key);
  if (!p) return null;
  const enUnidad = bandLimitsEnEspacioDe(key, p.bandLimits, valorMostrado);
  const ajusta = (b: number | null): number | null =>
    b == null ? null : CANONICAL_PCT_KEYS.has(key) ? decimalToPct(b) : b;
  const lo = ajusta(enUnidad[3] ?? null);
  const hi = ajusta(enUnidad[4] ?? null);
  return lo != null && hi != null ? { lo, hi } : null;
}

/** Dónde cayó el valor respecto de su ventana. */
export function direccionDe(valorMostrado: number, ventana: { lo: number; hi: number } | null): Direccion {
  if (!ventana) return 'dentro';
  if (valorMostrado < ventana.lo) return 'bajo';
  if (valorMostrado > ventana.hi) return 'alto';
  return 'dentro';
}

/** El párrafo del contenido escrito que corresponde a dónde cayó tu número. */
export function lecturaDe(contenido: ContenidoBiomarcador | null, direccion: Direccion): string | null {
  if (!contenido) return null;
  if (direccion === 'bajo') return contenido.bajo;
  if (direccion === 'alto') return contenido.alto;
  return contenido.dentro;
}

/** Índice de señales del panel completo, con el mismo lector que "Mi lectura". */
function señalesDelPanel(sexo: Sex, panel: Record<string, number>): Record<string, Señal> {
  const out: Record<string, Señal> = {};
  for (const [k, v] of Object.entries(panel ?? {})) {
    if (v == null || !Number.isFinite(v)) continue;
    const s = leerParametro(sexo, k, v, 'labs');
    if (s) out[k] = s;
  }
  return out;
}

/**
 * Las reglas de cruce en las que este marcador participa, ordenadas por qué tan
 * cerca le quedan.
 *
 * El orden importa de verdad. La homocisteína participa en el cruce del terreno
 * inflamatorio (donde es una candidata más entre seis) y en el de metilación
 * (donde es EL ancla, con folato y B12 como su pareja natural). Sin ordenar,
 * las seis del terreno llenaban el cupo y la B12 se quedaba fuera de la lista
 * de relacionados, que es justo el marcador que alguien viendo una
 * homocisteína alta necesita ver. Primero las reglas donde este marcador es el
 * ancla, después por peso.
 */
function reglasDe(key: string): typeof REGLAS_CRUCE {
  return REGLAS_CRUCE
    .filter((r) => r.ancla?.key === key || r.candidatas.some((c) => c.key === key))
    .slice()
    .sort((a, b) => {
      const anclaA = a.ancla?.key === key ? 0 : 1;
      const anclaB = b.ancla?.key === key ? 0 : 1;
      return anclaA - anclaB || b.peso - a.peso;
    });
}

/** Etiqueta legible de un parámetro, con el mismo fallback que "Mi lectura". */
function etiquetaDe(sexo: Sex, key: string): string {
  const meta = getLabParamMeta(key);
  if (meta.description) return meta.display_name;
  return findMatrizParam(sexo, key)?.name ?? meta.display_name;
}

/**
 * EL FILTRO DE CONVERGENCIA.
 *
 * Un valor fuera de ventana sin compañía es ruido, no un hallazgo. Esto corre
 * antes de que la pantalla pinte nada rojo, y usa el mismo predicado `cumple`
 * que el motor de "Mi lectura" para que las dos superficies nunca se
 * contradigan.
 */
export function convergenciaDe(
  sexo: Sex,
  key: string,
  estado: EstadoLab,
  contenido: ContenidoBiomarcador | null,
  señales: Record<string, Señal>,
): Convergencia {
  if (contenido?.derivado) {
    const bases = (contenido.seCalculaDe ?? []).map((k) => etiquetaDe(sexo, k));
    return {
      tipo: 'derivado',
      texto: bases.length
        ? `Este marcador no se mide: se calcula a partir de ${bases.join(' y ')}. Léelo como un resumen de esas piezas y revísalas a ellas antes de sacar cualquier conclusión. Por sí solo no levanta un hallazgo.`
        : 'Este marcador no se mide: se calcula a partir de otros. Léelo como un resumen y revisa las piezas que lo forman antes de concluir nada.',
    };
  }

  if (estado === 'sin_banda') {
    return {
      tipo: 'sin_alarma',
      texto: 'Este parámetro todavía no tiene ventana funcional en la matriz, así que no lo calificamos ni para bien ni para mal. Se muestra tu número y su historia, y nada más.',
    };
  }

  if (estado !== 'atencion') {
    return {
      tipo: 'sin_alarma',
      texto: estado === 'optimo'
        ? 'Está dentro de tu ventana funcional. No hay nada que perseguir aquí hoy.'
        : 'Está en zona aceptable: no pide acción, pero se puede afinar.',
    };
  }

  const reglas = reglasDe(key);
  if (reglas.length === 0) {
    return {
      tipo: 'sin_grupo',
      texto: 'Este marcador está fuera de tu ventana y todavía no forma parte de ningún cruce de lectura, así que no podemos decirte si converge con otros. Tómalo como un dato para tu consulta, no como un hallazgo.',
    };
  }

  const acompanantes: string[] = [];
  const vistos = new Set<string>([key]);
  for (const r of reglas) {
    const todas = [...(r.ancla ? [r.ancla] : []), ...r.candidatas];
    for (const c of todas) {
      if (vistos.has(c.key)) continue;
      if (cumple(señales[c.key], c.dir)) {
        vistos.add(c.key);
        acompanantes.push(etiquetaDe(sexo, c.key));
      }
    }
  }

  if (acompanantes.length === 0) {
    return {
      tipo: 'solo',
      texto: 'Está fuera de tu ventana y ningún otro marcador de su grupo lo acompaña. Un valor solo, sin convergencia, es ruido y no un hallazgo. Lo sensato es repetirlo en tu siguiente estudio antes de mover nada.',
    };
  }

  const lista = acompanantes.slice(0, 3).join(', ');
  return {
    tipo: 'converge',
    texto: `No está solo: ${lista} apunta${acompanantes.length > 1 ? 'n' : ''} en la misma dirección. Eso ya no es ruido de un estudio, es un patrón, y ahí es donde vale la pena trabajar.`,
    acompanantes,
    ruta: '/salud/mi-lectura',
  };
}

/**
 * Los marcadores que se leen junto con este. La relación NO se inventa: sale de
 * los cruces que ya existen. Si la persona no tiene uno medido, se dice, porque
 * eso es exactamente lo que le falta para cerrar la foto.
 */
export function relacionadosDe(
  sexo: Sex,
  key: string,
  panel: Record<string, number>,
  limite = 6,
): RelacionadoFicha[] {
  const out: RelacionadoFicha[] = [];
  const vistos = new Set<string>([key]);
  for (const r of reglasDe(key)) {
    const todas = [...(r.ancla ? [r.ancla] : []), ...r.candidatas];
    for (const c of todas) {
      if (vistos.has(c.key)) continue;
      // Solo se ofrecen marcadores que la matriz conoce: sin banda no hay ficha
      // que valga la pena abrir.
      if (!findMatrizParam(sexo, c.key)) continue;
      vistos.add(c.key);
      const valor = panel[c.key];
      out.push({
        key: c.key,
        label: etiquetaDe(sexo, c.key),
        estado: valor != null && Number.isFinite(valor) ? estadoDeParametro(sexo, c.key, valor) : null,
        porque: r.titular,
      });
      if (out.length >= limite) return out;
    }
  }
  return out;
}

/** Lo que le falta a esta ficha para estar completa. Se dice, no se esconde. */
export function huecosDe(
  contenido: ContenidoBiomarcador | null,
  estado: EstadoLab,
  delta: DeltaLab | null,
  vencido: boolean,
  relacionados: RelacionadoFicha[],
): string[] {
  const out: string[] = [];
  if (!contenido) {
    out.push('Todavía no escribimos la ficha de este parámetro. Tu número, tu ventana y tu historia sí son reales: lo que falta es el texto que explica qué es y qué lo mueve.');
  }
  if (estado === 'sin_banda') {
    out.push('La matriz funcional todavía no define una ventana para este parámetro. Cuando la tenga, esta ficha lo va a calificar.');
  }
  if (!delta) {
    out.push('Solo hay una medición. Con la siguiente ya se puede ver si se acercó o se alejó de tu ventana.');
  }
  if (vencido) {
    out.push('Tu último valor tiene más de un año. Vale la pena repetirlo antes de tomar decisiones con él.');
  }
  const sinMedir = relacionados.filter((r) => r.estado === null);
  if (sinMedir.length > 0) {
    const nombres = sinMedir.slice(0, 3).map((r) => r.label).join(', ');
    out.push(`No tienes medido ${nombres}. Son los que se leen junto con este, y sin ellos la lectura queda a medias.`);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// El punto de entrada
// ─────────────────────────────────────────────────────────────────────────────

export function construirFicha(e: EntradaFicha): FichaBiomarcador {
  const meta = getLabParamMeta(e.key);
  const contenido = contenidoDe(e.key);
  const mostrado = valorParaMostrar(e.key, e.valor);
  const ventana = ventanaParaMostrar(e.sexo, e.key, mostrado);
  const direccion = direccionDe(mostrado, ventana);
  const estado = estadoDeParametro(e.sexo, e.key, e.valor);
  const señales = señalesDelPanel(e.sexo, e.panel);
  const delta = deltaVsAnterior(
    e.serie,
    ventana ? [null, null, null, ventana.lo, ventana.hi, null, null, null] : null,
  );
  const relacionados = relacionadosDe(e.sexo, e.key, e.panel);

  return {
    key: e.key,
    label: etiquetaDe(e.sexo, e.key),
    abbr: meta.abbr,
    unidad: meta.unit ?? null,
    panelNombre: findMatrizDomain(e.sexo, e.key)?.domain_name_es ?? 'Otros',
    valor: mostrado,
    medidoEn: e.medidoEn,
    fuenteLabel: e.fuenteLabel,
    vencido: e.vencido,
    estado,
    estadoLabel: ESTADO_LABEL[estado],
    direccion,
    ventana,
    resumen: meta.description || 'Parámetro de laboratorio.',
    contenido,
    lectura: lecturaDe(contenido, direccion),
    convergencia: convergenciaDe(e.sexo, e.key, estado, contenido, señales),
    relacionados,
    delta,
    sinComparacion: delta ? null : SIN_COMPARACION,
    ciclo: isCycleSensitiveMarker(e.key)
      ? deriveLabCycleContext(e.key, e.sexo === 'female', e.faseCiclo)
      : { show: false, phaseKnown: false, note: '' },
    huecos: huecosDe(contenido, estado, delta, e.vencido, relacionados),
  };
}
