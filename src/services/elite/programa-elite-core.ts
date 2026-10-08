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
 *
 * 8-oct-2026 (nivel 2): el documento puede traer el nombre del programa y su
 * dia de inicio declarado. El inicio declarado MANDA sobre la primera carga
 * (el coach puede cargar el viernes un programa que arranca el lunes), y un
 * inicio declarado que todavia no llega se dice como "por empezar", no como
 * dia 1. Todo eso se decide aqui, en puro, para poder probarlo.
 */
import { esFechaReal, ELITE_PROGRAMA_NOMBRE_MAX, type EliteTipo } from './elite-v3-core';
import { SECCIONES_UI, formatearFecha, type SeccionUiKey } from './evaluacion-elite-core';
import { VOZ_ELITE, type VozPrograma } from './voz-programa-core';

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
// 1b. Inicio declarado, nombre y "por empezar" (8-oct-2026, nivel 2)
// ---------------------------------------------------------------------------

/** Lo que la fila vigente dice del programa, ya revisado. */
export interface DatosProgramaVigente {
  programaSemanas: number | null;
  /** `inicio.programa_nombre`, una linea con tope; null si no viene o viene roto. */
  nombre: string | null;
  /** `inicio.programa_inicio` solo si es una fecha real YYYY-MM-DD; si no, null. */
  inicioDeclarado: string | null;
  tipo: EliteTipo;
}

/**
 * Lee los cuatro campos de la fila vigente tal como llegan de la base (rutas
 * JSON: lo que no existe llega en null, asi que una fila cargada antes del
 * nivel 2 da nombre null, inicio null y tipo 'elite'). No confia en la forma:
 * la fila pudo cargarse sin pasar por el validador.
 */
export function datosDelProgramaVigente(
  fila: { ps?: unknown; pn?: unknown; pi?: unknown; tipo?: unknown } | null | undefined,
): DatosProgramaVigente {
  const ps = fila?.ps;
  const pn = typeof fila?.pn === 'string' ? fila.pn.replace(/\s+/g, ' ').trim() : '';
  const pi = typeof fila?.pi === 'string' ? fila.pi.trim() : '';
  return {
    programaSemanas: typeof ps === 'number' && Number.isFinite(ps) ? ps : null,
    nombre: pn.length > 0 && pn.length <= ELITE_PROGRAMA_NOMBRE_MAX ? pn : null,
    inicioDeclarado: esFechaReal(pi) ? pi : null,
    tipo: fila?.tipo === 'programa' ? 'programa' : 'elite',
  };
}

export type OrigenInicio = 'declarado' | 'primera_carga';

export interface InicioPrograma {
  /** YYYY-MM-DD. */
  inicio: string;
  origen: OrigenInicio;
}

/**
 * De donde se cuenta la semana. El inicio que el coach declaro manda cuando
 * es una fecha real; si no hay (o esta roto), la primera carga, como
 * siempre. `primeraCarga` llega ya como dia local YYYY-MM-DD. null = no hay
 * ninguna fecha que se pueda leer.
 */
export function inicioDelPrograma(
  declarado: string | null | undefined,
  primeraCarga: string | null | undefined,
): InicioPrograma | null {
  if (typeof declarado === 'string' && esFechaReal(declarado)) return { inicio: declarado, origen: 'declarado' };
  if (typeof primeraCarga === 'string' && esFechaReal(primeraCarga)) return { inicio: primeraCarga, origen: 'primera_carga' };
  return null;
}

/** El programa tiene dia de inicio declarado y todavia no llega. */
export interface PorEmpezar {
  /** YYYY-MM-DD en que empieza. */
  inicio: string;
  /** Dias de calendario que faltan, de 1 en adelante. */
  faltanDias: number;
}

export interface SituacionPrograma {
  /** YYYY-MM-DD desde donde se cuenta. */
  inicio: string;
  origen: OrigenInicio;
  /** null cuando el programa esta por empezar (o `hoy` no se pudo leer). */
  avance: AvancePrograma | null;
  /** No null solo con inicio DECLARADO en el futuro. */
  porEmpezar: PorEmpezar | null;
}

/**
 * La decision completa, en puro. Reglas:
 *  - Inicio declarado en el futuro: el programa esta POR EMPEZAR. No hay
 *    avance (ni dia 1 ni semana 1): decir "dia 1" a quien empieza el lunes
 *    seria inventarle un dia.
 *  - Inicio de primera carga en el futuro: solo pasa con el reloj del
 *    telefono atrasado; se queda la regla de siempre (cuenta como dia 1).
 *  - Sin ninguna fecha legible: null, y la pantalla dice que no se pudo leer.
 */
export function situacionDelPrograma(args: {
  declarado: string | null | undefined;
  primeraCarga: string | null | undefined;
  hoy: string;
  programaSemanas: number | null | undefined;
}): SituacionPrograma | null {
  const ini = inicioDelPrograma(args.declarado, args.primeraCarga);
  if (!ini) return null;
  const faltan = diasEntreFechas(args.hoy, ini.inicio);
  if (ini.origen === 'declarado' && faltan !== null && faltan > 0) {
    return { ...ini, avance: null, porEmpezar: { inicio: ini.inicio, faltanDias: faltan } };
  }
  return { ...ini, avance: avanceDelPrograma(ini.inicio, args.hoy, args.programaSemanas), porEmpezar: null };
}

/** "Empieza mañana" o "Empieza el 12 de octubre de 2026 · faltan 4 días". */
export function lineaPorEmpezar(p: PorEmpezar): string {
  if (p.faltanDias === 1) return 'Empieza mañana';
  return `Empieza el ${formatearFecha(p.inicio)} · faltan ${p.faltanDias} días`;
}

/**
 * La linea del encabezado con el nombre del programa delante, solo si hay
 * nombre: "Fuerza y sueño · Semana 3 de 12 · Día 17". Sin nombre es
 * exactamente `lineaAvance`.
 */
export function lineaAvanceConNombre(a: AvancePrograma, nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim();
  return n ? `${n} · ${lineaAvance(a)}` : lineaAvance(a);
}

/**
 * Lo mismo para cualquiera de los dos casos (en curso o por empezar). null
 * cuando no hay ni avance ni fecha por llegar: no hay linea que pintar.
 */
export function lineaDelPrograma(
  s: Pick<SituacionPrograma, 'avance' | 'porEmpezar'>,
  nombre: string | null | undefined,
): string | null {
  const n = (nombre ?? '').trim();
  if (s.porEmpezar) return n ? `${n} · ${lineaPorEmpezar(s.porEmpezar)}` : lineaPorEmpezar(s.porEmpezar);
  if (s.avance) return lineaAvanceConNombre(s.avance, n);
  return null;
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
 *
 * 8-oct-2026 (nivel 2): el asunto del correo sale de la voz. Quien no pasa
 * voz (los llamados de antes) sigue mandando "Mi programa ATP Elite".
 */
export function destinoContacto(
  whatsapp: string | null | undefined,
  correo: string,
  mensaje: string,
  voz: Pick<VozPrograma, 'asuntoCorreo'> = VOZ_ELITE,
): DestinoContacto {
  const digitos = (whatsapp ?? '').replace(/\D/g, '');
  if (digitos.length >= 10) {
    return { tipo: 'whatsapp', url: `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}` };
  }
  return {
    tipo: 'correo',
    url: `mailto:${correo}?subject=${encodeURIComponent(voz.asuntoCorreo)}&body=${encodeURIComponent(mensaje)}`,
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

/**
 * 8-oct-2026 (nivel 2): el titulo de un bloque segun la voz. Solo cambia uno:
 * en un programa SIN evaluacion, el bloque 'evaluacion' (donde caen Inicio y
 * Cierre, con las tres palancas) no puede llamarse "TU EVALUACIÓN" porque no
 * hay ninguna; se llama "TU PROGRAMA". Todo lo demas es el titulo de siempre.
 */
export function tituloDeBloque(
  bloque: Pick<BloquePrograma, 'key' | 'titulo'>,
  voz: Pick<VozPrograma, 'tipo' | 'conDiagnostico'> = VOZ_ELITE,
): string {
  if (bloque.key === 'evaluacion' && voz.tipo === 'programa' && !voz.conDiagnostico) return 'TU PROGRAMA';
  return bloque.titulo;
}

/** La etiqueta de una seccion, la misma que usa la pantalla de la evaluacion. */
export function etiquetaSeccion(key: SeccionUiKey): string {
  return SECCIONES_UI.find((s) => s.key === key)?.label ?? key;
}
