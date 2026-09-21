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
import type { Sex } from '@/src/types/edad-atp-v2';

export type EstadoHero = 'cargando' | 'no_se_pudo_leer' | 'sin_estudio' | 'con_estudio';

export interface EdadHero {
  integral: number;
  cronologica: number;
}

export interface MarcadorHero extends MarcadorParaImpacto {
  /** Nombre que ve la persona ("Glucosa en ayuno"). */
  etiqueta: string;
  /**
   * 20-sep-2026: fecha de la toma (YYYY-MM-DD, `measured_at`). Antes se
   * descartaba y un valor de hace cuatro meses en atencion quedaba en rojo
   * arriba de los optimos del estudio de hoy, sin que nadie viera la fecha.
   * null solo si la fila no la trae (no deberia: la columna es NOT NULL).
   */
  fecha: string | null;
}

export interface DatosHero {
  /** Hay al menos un valor de laboratorio no anulado. */
  tieneEstudio: boolean;
  /** Último cálculo persistido de Edad ATP, o null si nunca se calculó. */
  edad: EdadHero | null;
  /** Todos los marcadores medidos con su estado contra la ventana funcional. */
  marcadores: MarcadorHero[];
  /**
   * 20-sep-2026 (ronda de arreglos): el perfil no tiene sexo (sin fila, NULL
   * o un valor que la matriz no conoce). Los estados NO se calcularon: todo
   * viene `sin_banda`. El hero lo dice y manda al perfil; nunca asume uno.
   */
  faltaSexo: boolean;
}

/** Un valor medido antes de juzgarlo: lo que sale de lab_values sin la matriz. */
export interface ValorMedidoHero {
  key: string;
  etiqueta: string;
  value: number;
  fecha: string | null;
}

/** Peso y estado de un valor contra la matriz por sexo; lo pone el servicio (findMatrizParam, estadoDeParametro). */
export type JuezPorSexo = (sexo: Sex, key: string, value: number) => { peso: number; estado: EstadoMarcador };

/**
 * 20-sep-2026 (ronda de arreglos): el sexo puede faltar. Antes el servicio
 * asumia 'male' y con eso pintaba rangos de hombre a quien no lo dijo:
 * cambiar en silencio el dato de alguien. Sin sexo no se calcula ningun
 * estado: todo queda `sin_banda` ("Sin rango") con peso 0, y nadie cae en
 * `atencion` por un rango que no es suyo.
 */
export function marcadoresConSexo(
  sexo: Sex | null,
  valores: ReadonlyArray<ValorMedidoHero>,
  juez: JuezPorSexo,
): MarcadorHero[] {
  return valores.map((v) => {
    const { peso, estado } = sexo ? juez(sexo, v.key, v.value) : { peso: 0, estado: 'sin_banda' as const };
    return { key: v.key, etiqueta: v.etiqueta, peso, estado, fecha: v.fecha };
  });
}

/**
 * `biological_sex` como lo entiende la matriz; null si falta o no es binario.
 * 2026-09-21: el traductor vive en sexo-core (compartido por los diez sitios
 * que antes asumían hombre); aquí se reexporta para no mover imports.
 */
export { sexoDePerfil } from '@/src/services/salud/sexo-core';

/** Copy del hero viejo cuando falta el sexo: honesto, sin asumir, con destino al perfil. */
export const AVISO_FALTA_SEXO = 'Para leer tus rangos falta tu sexo en tu perfil';

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
 * 20-sep-2026: dos tomas con menos de esta distancia cuentan como el mismo
 * estudio (un laboratorio entrega el panel en varios dias; un sensor o una
 * bascula fechan distinto que la sangre). Mas lejos que esto, es una toma
 * anterior y se pinta con su fecha.
 */
export const VENTANA_MISMO_ESTUDIO_DIAS = 30;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' o ISO completo se lee "12 may 2026"; 'YYYY-MM' se lee "may 2026". Lo que no se entienda, tal cual. */
export function fechaTomaCorta(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(fecha);
  if (!m) return fecha;
  const mes = MESES_CORTOS[Number(m[2]) - 1];
  if (!mes) return fecha;
  return m[3] ? `${Number(m[3])} ${mes} ${m[1]}` : `${mes} ${m[1]}`;
}

/** La fecha de la toma mas reciente entre los medidos (YYYY-MM-DD), o null si ninguno la trae. */
export function ultimaToma(marcadores: ReadonlyArray<MarcadorHero>): string | null {
  let ultima: string | null = null;
  for (const m of marcadores) {
    if (m.fecha && (!ultima || m.fecha > ultima)) ultima = m.fecha;
  }
  return ultima;
}

/** Dias entre dos fechas YYYY-MM-DD (a - b), sin depender de la zona horaria. */
function diasEntre(a: string, b: string): number {
  const pa = a.slice(0, 10).split('-').map(Number);
  const pb = b.slice(0, 10).split('-').map(Number);
  const ta = Date.UTC(pa[0], (pa[1] || 1) - 1, pa[2] || 1);
  const tb = Date.UTC(pb[0], (pb[1] || 1) - 1, pb[2] || 1);
  return Math.round((ta - tb) / 86_400_000);
}

/**
 * Es de una toma ANTERIOR al ultimo estudio si su fecha queda a mas de la
 * ventana de distancia de la ultima toma. Sin fecha propia o sin ultima toma
 * no se puede afirmar: se trata como del estudio vigente (no se le quita
 * nada a nadie por un dato que falta).
 */
export function esDeTomaAnterior(
  m: MarcadorHero,
  ultima: string | null,
  ventanaDias: number = VENTANA_MISMO_ESTUDIO_DIAS,
): boolean {
  if (!m.fecha || !ultima) return false;
  return diasEntre(ultima, m.fecha) > ventanaDias;
}

/**
 * Los tres marcadores de mayor impacto, en el mismo orden que Free ve con
 * ficha (marcadoresAbiertosFree): así el hero y la lista de labs cuentan la
 * misma historia. Con tres o menos medidos, salen todos.
 *
 * 20-sep-2026: primero compiten SOLO los del ultimo estudio (misma ventana
 * que la toma mas reciente). Los de tomas anteriores solo rellenan si el
 * estudio de hoy trae menos de tres: un valor viejo en atencion ya no gana
 * sobre los optimos de hoy, pero tampoco desaparece cuando es lo unico.
 */
export function top3Marcadores(marcadores: ReadonlyArray<MarcadorHero>): MarcadorHero[] {
  const porKey = new Map<string, MarcadorHero>();
  for (const m of marcadores) if (!porKey.has(m.key)) porKey.set(m.key, m);
  const ultima = ultimaToma(marcadores);
  const recientes = marcadores.filter((m) => !esDeTomaAnterior(m, ultima));
  const anteriores = marcadores.filter((m) => esDeTomaAnterior(m, ultima));
  const elegir = (lista: ReadonlyArray<MarcadorHero>): MarcadorHero[] => marcadoresAbiertosFree(lista)
    .map((k) => porKey.get(k))
    .filter((m): m is MarcadorHero => m != null);
  const top = elegir(recientes);
  if (top.length >= 3 || anteriores.length === 0) return top;
  const vistos = new Set(top.map((m) => m.key));
  for (const m of elegir(anteriores)) {
    if (top.length >= 3) break;
    if (vistos.has(m.key)) continue;
    vistos.add(m.key);
    top.push(m);
  }
  return top;
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
