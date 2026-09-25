/**
 * programa-elite-core (25-sep-2026, app Elite DX simplificada). Logica pura,
 * sin react-native ni supabase, para que node la pruebe.
 *
 * Tres cosas que la app Elite DX necesita saber en cada pestana:
 *
 *  1. En que punto del programa va el cliente ("Semana 3 de 12 · Dia 17").
 *     El inicio es la PRIMERA carga de su evaluacion (decision de Enrique,
 *     25-sep-2026). La duracion sale del documento de ese cliente
 *     (`inicio.programa_semanas`, lo que Enrique escribio); si el documento
 *     no la trae, 12 meses (52 semanas), que fue la respuesta de Enrique.
 *     Cuando el programa termina no se esconde nada: se dice que se completo
 *     y la cuenta sigue como seguimiento.
 *
 *  2. A donde lleva "Escribele a Enrique": WhatsApp si hay numero, correo si
 *     no. Nunca un numero inventado.
 *
 *  3. Como se agrupan las 15 secciones de la evaluacion en "Mi programa":
 *     tu plan, tu evaluacion y lo que va con tu medico. Cada seccion cae en
 *     un solo bloque (lo verifica el test).
 */
import { SECCIONES_UI, type SeccionUiKey } from './evaluacion-elite-core';

// ---------------------------------------------------------------------------
// 1. El avance del programa
// ---------------------------------------------------------------------------

/** 12 meses cuando el documento no trae `programa_semanas`. */
export const SEMANAS_PROGRAMA_POR_DEFECTO = 52;

/**
 * true: si la evaluacion trae `programa_semanas`, esa es la duracion.
 * false: todos los clientes van a 12 meses. Es la unica linea que cambia si
 * Enrique prefiere lo contrario.
 */
export const USAR_SEMANAS_DE_LA_EVALUACION = true;

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Dias de calendario de `a` a `b` (YYYY-MM-DD). null si alguna no es fecha. */
export function diasEntreFechas(a: string, b: string): number | null {
  const ma = RE_FECHA.exec(a);
  const mb = RE_FECHA.exec(b);
  if (!ma || !mb) return null;
  const ta = Date.UTC(Number(ma[1]), Number(ma[2]) - 1, Number(ma[3]));
  const tb = Date.UTC(Number(mb[1]), Number(mb[2]) - 1, Number(mb[3]));
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

/** La duracion en semanas que se usa, con la regla de arriba. */
export function semanasDelPrograma(programaSemanas: number | null | undefined): number {
  if (
    USAR_SEMANAS_DE_LA_EVALUACION
    && typeof programaSemanas === 'number'
    && Number.isFinite(programaSemanas)
    && programaSemanas >= 1
  ) {
    return Math.round(programaSemanas);
  }
  return SEMANAS_PROGRAMA_POR_DEFECTO;
}

export interface AvancePrograma {
  /** Dia del programa, desde 1. */
  dia: number;
  /** Semana del programa, desde 1. Pasado el final sigue contando. */
  semana: number;
  semanasTotales: number;
  /** 0 a 100. */
  pct: number;
  /** Ya paso la ultima semana del programa. */
  completado: boolean;
}

/**
 * `inicio` y `hoy` en YYYY-MM-DD locales. null si no hay con que calcular
 * (fecha rota): la pantalla dice "no se pudo leer", no inventa una semana.
 * Un inicio en el futuro (reloj del telefono atrasado) cuenta como dia 1.
 */
export function avanceDelPrograma(
  inicio: string,
  hoy: string,
  programaSemanas: number | null | undefined,
): AvancePrograma | null {
  const transcurridos = diasEntreFechas(inicio, hoy);
  if (transcurridos === null) return null;
  const semanasTotales = semanasDelPrograma(programaSemanas);
  const totalDias = semanasTotales * 7;
  const dia = Math.max(1, transcurridos + 1);
  const semana = Math.ceil(dia / 7);
  return {
    dia,
    semana,
    semanasTotales,
    pct: Math.min(100, Math.round((dia / totalDias) * 100)),
    completado: dia > totalDias,
  };
}

/** "Semana 3 de 12 · Día 17" o, terminado, "Programa completado · semana 14". */
export function lineaAvance(a: AvancePrograma): string {
  if (a.completado) return `Programa de ${a.semanasTotales} semanas completado · semana ${a.semana}`;
  return `Semana ${a.semana} de ${a.semanasTotales} · Día ${a.dia}`;
}

// ---------------------------------------------------------------------------
// 2. Escribirle al coach
// ---------------------------------------------------------------------------

export type DestinoContacto =
  | { tipo: 'whatsapp'; url: string }
  | { tipo: 'correo'; url: string };

/**
 * WhatsApp necesita el numero con lada de pais y sin signos (wa.me). Menos
 * de 10 digitos no es un numero: se cae al correo en vez de abrir un chat
 * con nadie.
 */
export function destinoContacto(
  whatsapp: string | null | undefined,
  correo: string,
  mensaje: string,
): DestinoContacto {
  const digitos = (whatsapp ?? '').replace(/\D/g, '');
  if (digitos.length >= 10) {
    return { tipo: 'whatsapp', url: `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}` };
  }
  return {
    tipo: 'correo',
    url: `mailto:${correo}?subject=${encodeURIComponent('Mi programa ATP Elite')}&body=${encodeURIComponent(mensaje)}`,
  };
}

/** El mensaje con el que abre el chat. Sin datos de salud: viaja por un tercero. */
export function mensajeParaCoach(nombre: string | null | undefined, coach: string): string {
  const quien = (nombre ?? '').trim();
  return quien ? `Hola ${coach}, soy ${quien}. Te escribo desde la app de ATP.` : `Hola ${coach}, te escribo desde la app de ATP.`;
}

// ---------------------------------------------------------------------------
// 3. Los bloques de "Mi programa"
// ---------------------------------------------------------------------------

export type BloqueProgramaKey = 'plan' | 'evaluacion' | 'medico';

export interface BloquePrograma {
  key: BloqueProgramaKey;
  titulo: string;
  secciones: readonly SeccionUiKey[];
}

/**
 * El plan primero: es lo que el cliente consulta a diario. Luego su
 * evaluacion, en el orden en que Enrique la explica. "Pendientes" es lo que
 * tiene que ver con su medico y va aparte para que no se pierda.
 */
export const BLOQUES_PROGRAMA: readonly BloquePrograma[] = [
  { key: 'plan', titulo: 'TU PLAN', secciones: ['alimentacion', 'suplementos', 'entrenamiento'] },
  {
    key: 'evaluacion',
    titulo: 'TU EVALUACIÓN',
    secciones: ['inicio', 'conteo', 'edades', 'sistemas', 'marcadores', 'composicion', 'braverman', 'genetica', 'cruces', 'contexto', 'cierre'],
  },
  { key: 'medico', titulo: 'CON TU MÉDICO', secciones: ['medico'] },
];

/** La etiqueta de una seccion, la misma que usa la pantalla de la evaluacion. */
export function etiquetaSeccion(key: SeccionUiKey): string {
  return SECCIONES_UI.find((s) => s.key === key)?.label ?? key;
}
