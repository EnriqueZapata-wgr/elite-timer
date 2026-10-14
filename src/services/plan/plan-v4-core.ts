/**
 * plan-v4-core (8-oct-2026 (v4), Fase A). Logica PURA de la pestaña PLAN de
 * la v4 y de la hilera "Recomendadas por tu plan" de Apps. Sin react-native,
 * sin supabase y sin imagenes: node la prueba con
 * `node scripts/run-tests-sin-vitest.js src/services/plan/__tests__/plan-v4-core.test.ts`.
 *
 * POR QUE EXISTE. La v4 liga todo (R and D/ATP_V4_PLAN.md): el plan lleva a
 * su porque en el Perfil y a lo que toca hoy, y hoy lleva a las apps que el
 * plan recomienda. Mi plan (mi-plan-core) ya sabe armar el dia con lo que la
 * cuenta tiene; aqui NO se vuelve a leer ni a decidir el dia: se resume lo
 * que mi-plan-core ya armo, en cinco pilares, y se le pone su porque.
 *
 * Que decide aqui:
 *  1. La cabecera: dueño ("LO FIJÓ ENRIQUE" solo si hay algo fijado por un
 *     coach), el titulo del programa y su barra de avance. Sin fases ni
 *     hitos: en la Fase A ese dato no existe y no se inventa.
 *  2. Tus prioridades: las tres palancas del documento, cada una con los
 *     pilares de tu plan que toca (por palabras, nunca por adivinanza: sin
 *     coincidencia no se liga).
 *  3. Los pilares: una linea de la semana, el chip "Por qué" (razon del
 *     suplemento, objetivo de la rutina o la palanca) y el chip "Hoy" con lo
 *     de hoy.
 *  4. appsDelPlan: que apps abre tu plan, con su motivo.
 *
 * Reglas de honestidad (las de Mi plan, intactas):
 *  - Una parte que no se pudo leer marca SU pilar con "No se pudo leer";
 *    nunca se vuelve un cero ni un "no tienes".
 *  - Vacio solo se dice cuando se leyo y no hay nada.
 *  - Una parte no pedida (undefined) no pinta su pilar.
 *  - El documento se nombra con su voz: un programa nunca lee "Elite".
 *  - Nunca se supone el sexo: la compuerta de los habitos ya la aplico
 *    mi-plan-core, aqui no se agrega ninguna.
 */
import { parseHHMM, TOMA_POR_TIMING } from '@/src/services/agenda-core';
import {
  esRutinaDeCoach, resolverHoy, tituloDeAsignacion, type AsignacionRow,
} from '@/src/services/fitness/plan-semanal-core';
import { esDiaProgramado, esPlan } from '@/src/services/supplements/adherencia-core';
import type { EliteTipo, EliteV3, ElitePalanca } from '@/src/services/elite/elite-v3-core';
import {
  lineaDelPrograma, lineaPorEmpezar, type AvancePrograma, type PorEmpezar,
} from '@/src/services/elite/programa-elite-core';
import { nombreVisibleDelPlan, vozDe, vozDeDocumento } from '@/src/services/elite/voz-programa-core';
import { marcadorDePalanca, marcadoresDeEvaluacion } from '@/src/services/hoy/elite-hoy-core';
import { INTERVENTIONS_CATALOG } from '@/src/constants/interventions-catalog';
import type { ConceptKey } from '@/src/constants/concept-colors';
import {
  coachDelDia, etiquetaCoach, horaLimpia, momentosDeToma, RUTAS_MI_PLAN, semanaDe,
  type DiaPlan, type FilaPlan, type InsumosPlan, type SeccionKey, type SuplementoPlanRow,
} from './mi-plan-core';

// ---------------------------------------------------------------------------
// 0. Utilidades de texto
// ---------------------------------------------------------------------------

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** "a", "a y b", "a, b y c". */
export function unirConY(xs: readonly string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/** Sin acentos, minusculas, espacios simples. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function mismoNombre(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}

/** '06:45' -> '6:45'; '23:00' se queda. Lo que no es hora, tal cual. */
export function horaCorta(h: string): string {
  const limpia = horaLimpia(h);
  if (!limpia) return h;
  return limpia.startsWith('0') ? limpia.slice(1) : limpia;
}

/**
 * La primera frase de un texto, y si aun es larga, cortada en una palabra con
 * "…". Para chips y tarjetas chicas; el texto completo viaja aparte para
 * lectores de pantalla. Un titulo ("Recuperación: instalar un freno") no se
 * corta en su primera frase (`primeraFrase` false), solo en palabra.
 */
export function recortar(texto: string, max: number, primeraFrase = true): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const fin = primeraFrase ? limpio.search(/[.;:!?](\s|$)/) : -1;
  const frase = fin > 0 ? limpio.slice(0, fin) : limpio;
  if (frase.length <= max) return frase;
  const corte = frase.slice(0, Math.max(1, max - 1));
  const espacio = corte.lastIndexOf(' ');
  const base = (espacio > max * 0.5 ? corte.slice(0, espacio) : corte).replace(/[\s,;:.]+$/, '');
  return `${base}…`;
}

// ---------------------------------------------------------------------------
// 1. Rutas y destinos
// ---------------------------------------------------------------------------

/**
 * Las rutas que abre PLAN v4. Todas existen; ninguna es nueva en la Fase A
 * (el test las cruza contra app/). El Perfil v4 vive en la pestaña `salud`.
 */
export const RUTAS_PLAN_V4 = {
  perfil: '/salud',
  miPlan: RUTAS_MI_PLAN.miPlan,
  cronotipo: RUTAS_MI_PLAN.cronotipo,
  planEntrenamiento: RUTAS_MI_PLAN.planEntrenamiento,
  armar: RUTAS_MI_PLAN.armar,
  evaluacion: '/salud/evaluacion-elite',
} as const;

export type RutaPlanV4 = (typeof RUTAS_PLAN_V4)[keyof typeof RUTAS_PLAN_V4];

/** La razon de un suplemento lleva a donde vive el plan de suplementos. */
export const RUTA_SUPLEMENTOS = RUTAS_MI_PLAN.suplementos;

/** Un chip que se toca: lo que dice, lo que lee el lector de pantalla y a donde lleva. */
export interface ChipPlan {
  texto: string;
  accesible: string;
  ruta: RutaPlanV4;
}

/** Un enlace de un porque. La ruta puede llevar parametro (el marcador). */
export interface EnlacePlan {
  texto: string;
  ruta: string;
}

/**
 * El chip "Por qué" (8-oct-2026 (v4), revisión en frío): se abre AHI MISMO
 * con la razon completa. Antes llevaba al Perfil, que no muestra esa razon.
 * Solo cuando se conoce la llave de un marcador ofrece "Ver el marcador"
 * (el Perfil abre ese marcador con `?marcador=`); la razon de un suplemento
 * ofrece Mis suplementos; la del cronotipo, el cronotipo.
 */
export interface PorQuePlan {
  /** "Por qué: Corrige el nivel bajo…" */
  texto: string;
  /** La razon completa, tal cual la escribio el coach. */
  completo: string;
  accesible: string;
  enlaces: EnlacePlan[];
}

/** El Perfil v4 abierto en un marcador (builder P lee `marcador`). */
export function rutaMarcador(key: string): string {
  return `/salud?marcador=${encodeURIComponent(key)}`;
}

/** Sin puntuacion al final (para no leer "antiácidos.. Toca"). */
export function sinPuntoFinal(texto: string): string {
  return texto.replace(/[\s.;:,]+$/, '');
}

// ---------------------------------------------------------------------------
// 2. La cabecera
// ---------------------------------------------------------------------------

/** El estado del programa (la forma de useProgramaElite, copiada para no traer React al test). */
export type ProgramaParaPlan =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'sin_evaluacion' }
  | {
    estado: 'ok';
    avance: AvancePrograma | null;
    porEmpezar: PorEmpezar | null;
    nombre: string | null;
    tipo: EliteTipo;
  };

export interface CabeceraPlanV4 {
  /** 'cargando': aun no se sabe; 'error': no se pudo leer el programa (se dice, con Reintentar). */
  estado: 'cargando' | 'error' | 'listo';
  ceja: string;
  /** "LO FIJÓ ENRIQUE"; null si en la semana no hay nada fijado por un coach. */
  dueno: string | null;
  titulo: string;
  /** "Semana 3 de 12", "Empieza el ..."; null cuando no hay nada cierto que decir. */
  subtitulo: string | null;
  /** Lo que lee el lector de pantalla (la linea completa del programa). */
  accesible: string;
  /** La barra del programa. Solo con avance real: ni por empezar ni fecha ilegible. */
  progreso: { pct: number; texto: string; completado: boolean } | null;
}

export const CEJA_PLAN = 'TU PLAN';
export const TITULO_PLAN_NEUTRO = 'Tu plan de la semana';
export const TITULO_PROGRAMA_NO_LEIDO = 'No se pudo leer tu programa';
export const CUERPO_PROGRAMA_NO_LEIDO = 'Revisa tu conexión y vuelve a intentar.';

/**
 * La foto del heroe del programa: B/N y sin persona. Es atardecer-03 del banco
 * sin persona de HOY (IMAGENES_PROGRAMA_SIN_PERSONA); saturacion media
 * medida 0.0001 a resolucion nativa (HSV, 8-oct-2026).
 */
export const IMAGEN_HERO_PLAN = 'assets/images/hoy-extra/tu-dia/atardecer-03.webp';
const TITULO_PROGRAMA_SIN_NOMBRE = 'Tu programa';

/**
 * La cabecera de PLAN. `coachesSemana` es coachesDeLaSemana (un nombre por
 * fila "Lo fijó ..." de la semana): vacio = nada fijado por un coach y el
 * dueño no se dice. El nombre del programa pasa por la voz: en un programa,
 * un nombre que diga "Elite" se descarta. Sin programa (o sin leerlo) el
 * titulo es neutro: nunca se afirma que no hay programa.
 */
export function cabeceraDelPlan(args: {
  programa: ProgramaParaPlan;
  coachesSemana: ReadonlyArray<string | null>;
}): CabeceraPlanV4 {
  const { programa, coachesSemana } = args;
  const dueno = coachesSemana.length > 0
    ? etiquetaCoach(coachDelDia({ coaches: [...coachesSemana] })).toUpperCase()
    : null;
  if (programa.estado === 'error') {
    // Nunca un titulo neutro que parezca bien: se dice que no se pudo leer.
    return {
      estado: 'error', ceja: CEJA_PLAN, dueno, titulo: TITULO_PROGRAMA_NO_LEIDO, subtitulo: CUERPO_PROGRAMA_NO_LEIDO,
      accesible: `${TITULO_PROGRAMA_NO_LEIDO}. ${CUERPO_PROGRAMA_NO_LEIDO}`, progreso: null,
    };
  }
  if (programa.estado === 'cargando') {
    return { estado: 'cargando', ceja: CEJA_PLAN, dueno, titulo: '', subtitulo: null, accesible: CEJA_PLAN, progreso: null };
  }
  if (programa.estado !== 'ok') {
    return {
      estado: 'listo', ceja: CEJA_PLAN, dueno, titulo: TITULO_PLAN_NEUTRO, subtitulo: null, accesible: TITULO_PLAN_NEUTRO, progreso: null,
    };
  }
  const nombre = vozDe({ tipo: programa.tipo, nombre: programa.nombre }).nombre;
  const titulo = nombre ?? TITULO_PROGRAMA_SIN_NOMBRE;
  const a = programa.porEmpezar ? null : programa.avance;
  let subtitulo: string | null = null;
  let progreso: CabeceraPlanV4['progreso'] = null;
  if (programa.porEmpezar) {
    subtitulo = lineaPorEmpezar(programa.porEmpezar);
  } else if (a) {
    subtitulo = a.completado
      ? `Programa de ${a.semanasTotales} semanas completado`
      : `Semana ${a.semana} de ${a.semanasTotales}`;
    progreso = a.completado
      ? { pct: 100, texto: 'Programa completado', completado: true }
      : { pct: Math.max(0, Math.min(100, a.pct)), texto: `Día ${a.dia} de ${a.semanasTotales * 7}`, completado: false };
  }
  const linea = lineaDelPrograma({ avance: a, porEmpezar: programa.porEmpezar }, nombre);
  return { estado: 'listo', ceja: CEJA_PLAN, dueno, titulo, subtitulo, accesible: linea ?? titulo, progreso };
}

// ---------------------------------------------------------------------------
// 3. Los pilares y sus palancas
// ---------------------------------------------------------------------------

export type PilarKey = 'suplementos' | 'alimentacion' | 'entrenamiento' | 'sueno' | 'practicas';

/** El orden de las tarjetas (tablero aprobado). */
export const ORDEN_PILARES: readonly PilarKey[] = ['suplementos', 'alimentacion', 'entrenamiento', 'sueno', 'practicas'];

export const TITULO_PILAR: Readonly<Record<PilarKey, string>> = {
  suplementos: 'Suplementos',
  alimentacion: 'Alimentación',
  entrenamiento: 'Entreno',
  sueno: 'Sueño',
  practicas: 'Prácticas y hábitos',
};

/** A media frase ("En tu plan: alimentación, sueño y prácticas"). */
const PILAR_MINUSCULA: Readonly<Record<PilarKey, string>> = {
  suplementos: 'suplementos',
  alimentacion: 'alimentación',
  entrenamiento: 'entreno',
  sueno: 'sueño',
  practicas: 'prácticas',
};

/** Cada pilar sale de la seccion de Mi plan del mismo nombre (Reintentar relee sus partes). */
export const SECCION_DE_PILAR: Readonly<Record<PilarKey, SeccionKey>> = {
  suplementos: 'suplementos',
  alimentacion: 'alimentacion',
  entrenamiento: 'entrenamiento',
  sueno: 'sueno',
  practicas: 'practicas',
};

/**
 * El dominio de color de cada pilar (14-oct-2026, ronda de marca). La
 * miniatura del pilar lleva la diagonal del degradado de su dominio
 * (CONCEPT_COLORS, la fuente unica de color por concepto): un pilar se
 * reconoce por su color como en HOY y en Habitos. Solo tipo: este modulo
 * sigue sin importar colores.
 *  - suplementos: suplementos (naranja)
 *  - alimentacion: nutricion (azul)
 *  - entrenamiento: fitness (lima de categoria, no el lima de acento)
 *  - sueno: sueno (indigo)
 *  - practicas: mente (morado)
 */
export const CONCEPTO_DE_PILAR: Readonly<Record<PilarKey, ConceptKey>> = {
  suplementos: 'suplementos',
  alimentacion: 'nutricion',
  entrenamiento: 'fitness',
  sueno: 'sueno',
  practicas: 'mente',
};

/**
 * La foto de cada pilar: B/N y SIN persona (nunca se le pone sexo a quien no
 * se le pregunto). Las cinco con foto, o ninguna: no se mezcla foto y glifo.
 * 8-oct-2026 (v4, revisión en frío): las primeras eran a color; estas se
 * eligieron midiendo la saturacion media (HSV, PIL) y viendolas una por una.
 * Saturacion media medida a resolucion NATIVA (1200 px de ancho):
 *  - suplementos: electrons/suplementos, frascos alineados (0.0034)
 *  - alimentacion: agenda/comida/comida-04, cuencos con nueces (0.0000)
 *  - entrenamiento: health-hub/mi-salud, corazon esculpido sobre fondo negro
 *    (0.0000). El banco no tiene equipo de gimnasio sin atleta; el corazon
 *    evoca el trabajo cardiovascular sin persona. (otros-01, el reloj, quedo
 *    fuera: 0.0516 a resolucion nativa.)
 *  - sueno: hoy-extra/sueno, almohada y sabanas vacias (0.0000)
 *  - practicas: intervenciones/calor, piedras de sauna con vapor (0.0000)
 *  - heroe (IMAGEN_HERO_PLAN): tu-dia/atardecer-03 (0.0001)
 * El componente hace el require(); el test amarra la lista y que existan.
 */
export const IMAGEN_PILAR: Readonly<Record<PilarKey, string>> = {
  suplementos: 'assets/images/electrons/suplementos.webp',
  alimentacion: 'assets/images/agenda/comida/comida-04.webp',
  entrenamiento: 'assets/images/health-hub/mi-salud.webp',
  sueno: 'assets/images/hoy-extra/sueno.webp',
  practicas: 'assets/images/intervenciones/calor.webp',
};

/**
 * Palabras por pilar, sin acentos, que se comparan COMPLETAS (8-oct-2026 (v4),
 * revisión en frío: con prefijos, "sol" ligaba con "Solo una copa"). Solo
 * palabras que en una palanca hablan de ese pilar; las ambiguas se quedan
 * fuera: "noche" (cualquier hora), "fuerza" (de voluntad), "practica",
 * "habito", "recuperar", "rutina", "cafe".
 */
const PALABRAS_PILAR: Readonly<Record<PilarKey, ReadonlySet<string>>> = {
  suplementos: new Set([
    'suplemento', 'suplementos', 'magnesio', 'omega', 'vitamina', 'vitaminas', 'creatina', 'capsula', 'capsulas',
    'dosis', 'zinc',
  ]),
  alimentacion: new Set([
    'alimentacion', 'comida', 'comidas', 'comer', 'comes', 'proteina', 'proteinas', 'ventana', 'ayuno', 'ayunos',
    'ayunar', 'azucar', 'azucares', 'carbohidrato', 'carbohidratos', 'grasa', 'grasas', 'fibra', 'insulina',
    'glucosa', 'caloria', 'calorias', 'desayuno', 'cena', 'cenar', 'alcohol', 'trago', 'tragos', 'verdura',
    'verduras', 'nutricion',
  ]),
  entrenamiento: new Set([
    'entrenamiento', 'entrenar', 'entrena', 'entrenas', 'cardio', 'caminata', 'caminatas', 'caminar', 'musculo',
    'musculos', 'muscular', 'ejercicio', 'ejercicios', 'pesas', 'vo2max', 'movilidad', 'pasos', 'sentadilla',
    'sentadillas', 'aerobico', 'aerobica',
  ]),
  sueno: new Set([
    'sueno', 'dormir', 'duermes', 'dormido', 'descanso', 'descansar', 'melatonina', 'circadiano', 'circadiana',
    'despertar', 'despiertas',
  ]),
  practicas: new Set([
    'respiracion', 'respirar', 'meditacion', 'meditar', 'estres', 'calma', 'journal', 'frio', 'sauna', 'grounding',
    'pantalla', 'pantallas', 'sol',
  ]),
};

/** Palabras de tres letras o mas, sin acentos. Con repeticion (cuenta como peso). */
function palabras(texto: string): string[] {
  return normalizar(texto).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

/** Palabras que nunca ligan solas aunque vengan en el nombre de un suplemento o una practica. */
const VACIAS_EXTRA = new Set(['para', 'como', 'antes', 'despues', 'minutos', 'nivel', 'forma', 'activa', 'pequeno', 'matutina']);

/**
 * Palabras extra de lo que la persona tiene en su plan (nombres de sus
 * suplementos o practicas), para que una palanca que nombra "magnesio" ligue
 * con el pilar donde vive su magnesio. Cinco letras o mas.
 */
export function palabrasDeNombres(nombres: ReadonlyArray<string>): string[] {
  const out = new Set<string>();
  for (const n of nombres) for (const p of palabras(n)) if (p.length >= 5 && !VACIAS_EXTRA.has(p)) out.add(p);
  return [...out];
}

/** Cuanto habla una palanca de un pilar: palabras de su titulo, por que y como que caen en el pilar. */
export function puntajePilar(p: ElitePalanca, pilar: PilarKey, extra: readonly string[] = []): number {
  const propias = PALABRAS_PILAR[pilar];
  const extras = new Set(extra);
  let puntos = 0;
  for (const t of palabras(`${p.titulo} ${p.por_que} ${p.como}`)) {
    if (propias.has(t) || extras.has(t)) puntos += 1;
  }
  return puntos;
}

/**
 * La palanca que explica un pilar: la que mas habla de el. Empate: la de
 * mayor prioridad (el orden del documento es la prioridad del coach). null si
 * ninguna lo nombra: entonces el pilar no lleva porque de palanca.
 */
export function palancaDePilar(
  palancas: ReadonlyArray<ElitePalanca>,
  pilar: PilarKey,
  extra: readonly string[] = [],
): number | null {
  let mejor = -1;
  let puntosMejor = 0;
  palancas.forEach((p, i) => {
    const puntos = puntajePilar(p, pilar, extra);
    if (puntos > puntosMejor) { mejor = i; puntosMejor = puntos; }
  });
  return mejor >= 0 ? mejor : null;
}

/** Palabras extra por pilar, de lo que la cuenta tiene en su plan. */
export type ExtrasPorPilar = Partial<Record<PilarKey, readonly string[]>>;

export function extrasDelPlan(ins: InsumosPlan): ExtrasPorPilar {
  const sup = ins.suplementos && ins.suplementos.ok ? ins.suplementos.dato.map((r) => r.name ?? '') : [];
  const pra = ins.practicas && ins.practicas.ok ? ins.practicas.dato.map((p) => p.nombre) : [];
  const hab = ins.habitos && ins.habitos.ok ? ins.habitos.dato.map((h) => h.nombre) : [];
  return { suplementos: palabrasDeNombres(sup), practicas: palabrasDeNombres([...pra, ...hab]) };
}

export interface PrioridadV4 {
  /** 1, 2 o 3: la prioridad del coach (el orden del documento, sin filtrar). */
  numero: number;
  titulo: string;
  /** El por que en una frase corta (tarjeta). */
  porQue: string;
  /** El por que completo (lector de pantalla). */
  porQueCompleto: string;
  /** Los pilares de tu plan que toca, del que mas habla al que menos. */
  pilares: PilarKey[];
  /** "En tu plan: alimentación y sueño"; null si no toca ninguno con plan. */
  enTuPlan: string | null;
  /** El marcador que la justifica (marcadorDePalanca); null si no comparte palabras con ninguno. */
  marcador: { key: string; nombre: string } | null;
  /**
   * Se ofrece "Ver en tu perfil" solo si el documento trae evaluacion: un
   * programa sin evaluacion no tiene en el Perfil nada de esta palanca.
   */
  verPerfil: boolean;
}

/** Las palancas con su numero real (indice del documento + 1); las sin titulo no se cuentan ni se pintan. */
function palancasNumeradas(doc: EliteV3 | null | undefined): Array<{ p: ElitePalanca; numero: number }> {
  const palancas: ReadonlyArray<ElitePalanca> = doc && Array.isArray(doc.cierre?.palancas) ? doc.cierre.palancas : [];
  return palancas
    .map((p, i) => ({ p, numero: i + 1 }))
    .filter(({ p }) => p && typeof p.titulo === 'string' && p.titulo.trim() !== '');
}

/** El marcador de una palanca, si el documento lo permite saber. */
function marcadorDe(doc: EliteV3, p: ElitePalanca): { key: string; nombre: string } | null {
  const m = marcadorDePalanca(p, marcadoresDeEvaluacion(doc));
  return m && typeof m.key === 'string' && m.key.trim() !== '' ? { key: m.key.trim(), nombre: m.nombre } : null;
}

/**
 * Las palancas del documento como "Tus prioridades". `conPlan` son los
 * pilares que de verdad tienen algo en el plan de esta cuenta: una palanca no
 * manda a un pilar vacio. Sin documento: []. El numero es el mismo que lleva
 * el chip "Por qué" de un pilar (los dos cuentan sobre el documento sin filtrar).
 */
export function prioridadesDelPlan(
  doc: EliteV3 | null | undefined,
  conPlan: ReadonlyArray<PilarKey>,
  extras: ExtrasPorPilar = {},
): PrioridadV4[] {
  if (!doc) return [];
  const verPerfil = vozDeDocumento(doc).conDiagnostico;
  return palancasNumeradas(doc).map(({ p, numero }) => {
    const pilares = ORDEN_PILARES
      .filter((k) => conPlan.includes(k))
      .map((k) => ({ k, puntos: puntajePilar(p, k, extras[k] ?? []) }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || ORDEN_PILARES.indexOf(a.k) - ORDEN_PILARES.indexOf(b.k))
      .slice(0, 3)
      .map((x) => x.k);
    const porQue = (p.por_que ?? '').trim();
    return {
      numero,
      titulo: p.titulo.trim(),
      porQue: porQue ? recortar(porQue, 120) : '',
      porQueCompleto: porQue,
      pilares,
      enTuPlan: pilares.length > 0 ? `En tu plan: ${unirConY(pilares.map((k) => PILAR_MINUSCULA[k]))}` : null,
      marcador: marcadorDe(doc, p),
      verPerfil,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Los pilares
// ---------------------------------------------------------------------------

export type PilarV4 =
  | { key: PilarKey; titulo: string; estado: 'error' }
  | {
    key: PilarKey;
    titulo: string;
    estado: 'vacio';
    texto: string;
    cta: { texto: string; ruta: RutaPlanV4 } | null;
  }
  | {
    key: PilarKey;
    titulo: string;
    estado: 'ok';
    /** Una linea de la semana: "6 · en 3 tomas al día". */
    resumen: string;
    porQue: PorQuePlan | null;
    hoy: ChipPlan | null;
    /** Una de sus lecturas fallo y la otra no: se pinta lo leido y se dice. */
    parcial: string | null;
  };

export interface EntradaPilares {
  ins: InsumosPlan;
  /** Hoy ya compuesto: componerDia(ins, hoy, hoy, ctx). */
  dia: DiaPlan;
  /** YYYY-MM-DD local. */
  hoy: string;
  /** El documento vigente leido; null = no hay, o no se pudo leer (los porques del documento se omiten). */
  documento: EliteV3 | null;
  /** Minutos desde la medianoche, para "lo que sigue hoy". null = no se sabe. */
  ahoraMin?: number | null;
}

function pilarError(key: PilarKey): PilarV4 {
  return { key, titulo: TITULO_PILAR[key], estado: 'error' };
}

function pilarVacio(key: PilarKey, texto: string, cta: { texto: string; ruta: RutaPlanV4 } | null = null): PilarV4 {
  return { key, titulo: TITULO_PILAR[key], estado: 'vacio', texto, cta };
}

function pilarOk(
  key: PilarKey, resumen: string, porQue: PorQuePlan | null, hoy: ChipPlan | null, parcial: string | null = null,
): PilarV4 {
  return { key, titulo: TITULO_PILAR[key], estado: 'ok', resumen, porQue, hoy, parcial };
}

function chipHoy(texto: string): ChipPlan {
  return { texto: `Hoy: ${texto}`, accesible: `Hoy: ${texto}. Abre tu semana completa.`, ruta: RUTAS_PLAN_V4.miPlan };
}

function chipPorQue(texto: string, completo: string, enlaces: EnlacePlan[] = [], primeraFrase = true): PorQuePlan {
  const limpio = sinPuntoFinal(completo.replace(/\s+/g, ' ').trim());
  return {
    texto: `Por qué: ${recortar(texto, 48, primeraFrase)}`,
    completo: limpio,
    accesible: `Por qué: ${limpio}. Toca para leerlo completo.`,
    enlaces,
  };
}

/** El porque de palanca de un pilar, con el mismo numero que "Tus prioridades". */
function chipDePalanca(doc: EliteV3 | null, pilar: PilarKey, extras: ExtrasPorPilar): PorQuePlan | null {
  if (!doc) return null;
  const numeradas = palancasNumeradas(doc);
  const i = palancaDePilar(numeradas.map((x) => x.p), pilar, extras[pilar] ?? []);
  if (i === null) return null;
  const { p, numero } = numeradas[i];
  const titulo = p.titulo.trim();
  const porQue = sinPuntoFinal((p.por_que ?? '').trim());
  const m = marcadorDe(doc, p);
  const enlaces = m ? [{ texto: 'Ver el marcador', ruta: rutaMarcador(m.key) }] : [];
  return chipPorQue(titulo, `Tu prioridad ${numero}, ${titulo}${porQue ? `. ${porQue}` : ''}`, enlaces, false);
}

// --- Suplementos -------------------------------------------------------------

function suplementosDelPlan(rows: ReadonlyArray<SuplementoPlanRow>): SuplementoPlanRow[] {
  return rows.filter((r) => r && r.is_active !== false && esPlan(r) && (r.name ?? '').trim() !== '');
}

/** Las tomas de una ficha como llaves comparables ("manana", "21:30"). Sin momento: []. */
function llavesDeToma(r: Pick<SuplementoPlanRow, 'timing' | 'dose_times'>): string[] {
  const tomas = Array.isArray(r.dose_times)
    ? r.dose_times.filter((l): l is string => typeof l === 'string' && l.trim() !== '')
    : [];
  if (tomas.length > 0) return tomas.map((t) => horaLimpia(t) ?? normalizar(t));
  const toma = r.timing ? TOMA_POR_TIMING[r.timing] : undefined;
  return toma ? [normalizar(toma)] : [];
}

/**
 * Cuantos momentos distintos del dia toma la persona sus suplementos diarios
 * (los 'semanal' no tienen dia y no cuentan). Dos fichas en el mismo momento
 * son una sola toma.
 */
export function tomasAlDia(rows: ReadonlyArray<SuplementoPlanRow>): number {
  const llaves = new Set<string>();
  for (const r of suplementosDelPlan(rows)) {
    if (r.dose_pattern === 'semanal') continue;
    for (const k of llavesDeToma(r)) llaves.add(k);
  }
  return llaves.size;
}

/** "6 · en 3 tomas al día". null = no hay suplementos en el plan. */
export function resumenSuplementos(rows: ReadonlyArray<SuplementoPlanRow>): string | null {
  const plan = suplementosDelPlan(rows);
  if (plan.length === 0) return null;
  const diarios = plan.filter((r) => r.dose_pattern !== 'semanal').length;
  const k = tomasAlDia(plan);
  if (diarios === 0) return `${plan.length} · una vez por semana`;
  if (k === 0) return `${plan.length} en tu plan`;
  return `${plan.length} · en ${plural(k, 'toma', 'tomas')} al día`;
}

/**
 * El por que de los suplementos: la razon que escribio el coach para uno que
 * SI esta en el plan de la persona (el primero del documento que aparece).
 * Sin coincidencia de nombre no se toma una razon ajena.
 */
export function razonDeSuplemento(
  doc: EliteV3 | null, rows: ReadonlyArray<SuplementoPlanRow>,
): { nombre: string; razon: string } | null {
  if (!doc || !Array.isArray(doc.suplementos)) return null;
  const nombres = suplementosDelPlan(rows).map((r) => normalizar(r.name ?? ''));
  for (const s of doc.suplementos) {
    const razon = (s?.por_que ?? '').trim();
    const nombre = (s?.nombre ?? '').trim();
    if (!razon || !nombre) continue;
    const n = normalizar(nombre);
    if (nombres.some((x) => x === n || x.startsWith(`${n} `) || n.startsWith(`${x} `))) return { nombre, razon };
  }
  return null;
}

function pilarSuplementos(e: EntradaPilares, extras: ExtrasPorPilar): PilarV4 | null {
  const lectura = e.ins.suplementos;
  if (!lectura) return null;
  if (!lectura.ok) return pilarError('suplementos');
  const resumen = resumenSuplementos(lectura.dato);
  if (!resumen) return pilarVacio('suplementos', 'No hay suplementos en tu plan.');
  const c = e.dia.conteo;
  let hoy: ChipPlan | null = null;
  if (typeof c.suplementos === 'number') {
    if (c.suplementos > 0) hoy = chipHoy(plural(c.suplementos, 'suplemento', 'suplementos'));
    else if ((c.suplementosSemanales ?? 0) > 0) hoy = chipHoy('uno semanal, sin día fijo');
    else hoy = chipHoy('no toca ninguno');
  }
  const r = razonDeSuplemento(e.documento, lectura.dato);
  // La razon del suplemento no trae llave de marcador: su enlace es Mis suplementos.
  const porQue = r
    ? chipPorQue(r.razon, `${r.nombre}: ${r.razon}`, [{ texto: 'Ver en Mis suplementos', ruta: RUTA_SUPLEMENTOS }])
    : chipDePalanca(e.documento, 'suplementos', extras);
  return pilarOk('suplementos', resumen, porQue, hoy);
}

// --- Alimentacion ------------------------------------------------------------

function pilarAlimentacion(e: EntradaPilares, extras: ExtrasPorPilar): PilarV4 | null {
  const { planAlimentacion: lp, metas: lm, evaluacion: le } = e.ins;
  if (!lp && !lm) return null;
  const planFallo = !!lp && !lp.ok;
  const metasFallo = !!lm && !lm.ok;
  const plan = lp && lp.ok ? lp.dato : null;
  const metas = lm && lm.ok ? lm.dato : null;
  const evaluacion = le && le.ok ? le.dato : null;
  const ventana = evaluacion?.ventana ?? null;
  const pedidas = (lp ? 1 : 0) + (lm ? 1 : 0);
  const fallidas = (planFallo ? 1 : 0) + (metasFallo ? 1 : 0);
  if (fallidas === pedidas && !ventana) return pilarError('alimentacion');
  const parcial = planFallo ? 'No se pudo leer tu plan de alimentación.'
    : metasFallo ? 'No se pudieron leer tus metas.'
      : null;

  const partes: string[] = [];
  if (ventana) partes.push(`Ventana ${horaCorta(ventana.inicio)} a ${horaCorta(ventana.fin)}`);
  if (plan) {
    if (plan.metas.length > 0) partes.push(...plan.metas.slice(0, ventana ? 1 : 2));
    else {
      // Sin voz conocida, neutro: a un programa nunca se le dice "Plan Elite".
      const nombre = nombreVisibleDelPlan((plan.nombre ?? '').trim(), evaluacion?.voz ?? { tipo: 'programa' })
        || 'Plan de alimentación';
      partes.push(plan.comidas.length > 0 ? `${nombre} · ${plural(plan.comidas.length, 'comida', 'comidas')}` : nombre);
    }
  }
  if (partes.length === 0 && evaluacion?.alimentacion) partes.push(evaluacion.alimentacion.titulo);
  if (partes.length === 0 && metas) {
    const m: string[] = [];
    if (metas.proteina_g != null) m.push(`Proteína ${Math.round(metas.proteina_g)} g`);
    if (metas.agua_ml != null) m.push(`agua ${Math.round(metas.agua_ml)} ml`);
    if (m.length > 0) partes.push(m.join(' · '));
  }
  if (partes.length === 0) {
    // Con una lectura caida no se puede afirmar que no hay plan: se dice lo leido.
    if (parcial) return pilarOk('alimentacion', 'Lo que se leyó no trae un plan de alimentación.', null, null, parcial);
    return pilarVacio('alimentacion', 'Todavía no hay un plan de alimentación.');
  }

  let hoy: ChipPlan | null = null;
  if (ventana) hoy = chipHoy(`comes de ${horaCorta(ventana.inicio)} a ${horaCorta(ventana.fin)}`);
  else if (plan && plan.comidas.length > 0) hoy = chipHoy(plural(plan.comidas.length, 'comida', 'comidas'));
  else if (metas?.proteina_g != null) hoy = chipHoy(`${Math.round(metas.proteina_g)} g de proteína`);

  return pilarOk('alimentacion', partes.slice(0, 2).join(' · '), chipDePalanca(e.documento, 'alimentacion', extras), hoy, parcial);
}

// --- Entreno -----------------------------------------------------------------

/** Lo que toca en la semana de `hoy`: titulos distintos, en orden, y cuantos dias se entrena. */
export function semanaDeEntreno(rows: ReadonlyArray<AsignacionRow>, hoy: string): { titulos: string[]; dias: number } {
  const titulos: string[] = [];
  let dias = 0;
  for (const fecha of semanaDe(hoy)) {
    const { elegida } = resolverHoy([...rows], fecha);
    if (!elegida) continue;
    dias += 1;
    const t = tituloDeAsignacion(elegida);
    if (!titulos.some((x) => mismoNombre(x, t))) titulos.push(t);
  }
  return { titulos, dias };
}

/** "Fuerza A, Fuerza B y Fuerza C · 3 días a la semana"; con mas de tres sesiones distintas, solo los dias. */
export function resumenEntreno(rows: ReadonlyArray<AsignacionRow>, hoy: string): string | null {
  const { titulos, dias } = semanaDeEntreno(rows, hoy);
  if (dias === 0) return null;
  const cuantos = `${plural(dias, 'día', 'días')} a la semana`;
  return titulos.length <= 3 ? `${unirConY(titulos)} · ${cuantos}` : cuantos;
}

/**
 * El por que del entreno: el objetivo que el coach escribio para la rutina de
 * HOY (mismo nombre en el documento); si hoy no toca una del documento, el de
 * la primera rutina de la semana que si este. Sin objetivo escrito, null.
 */
export function objetivoDeRutina(
  doc: EliteV3 | null, rows: ReadonlyArray<AsignacionRow>, hoy: string,
): { nombre: string; objetivo: string } | null {
  const rutinas = doc?.entrenamiento?.rutinas ?? [];
  if (rutinas.length === 0) return null;
  const deHoy = resolverHoy([...rows], hoy).elegida;
  const candidatos = [...(deHoy ? [tituloDeAsignacion(deHoy)] : []), ...semanaDeEntreno(rows, hoy).titulos];
  for (const t of candidatos) {
    const r = rutinas.find((x) => typeof x?.nombre === 'string' && mismoNombre(x.nombre, t));
    const objetivo = (r?.objetivo ?? '').trim();
    if (r && objetivo) return { nombre: r.nombre.trim(), objetivo };
  }
  return null;
}

function pilarEntreno(e: EntradaPilares, extras: ExtrasPorPilar): PilarV4 | null {
  const lr = e.ins.rutinas;
  if (!lr) return null;
  const evaluacion = e.ins.evaluacion && e.ins.evaluacion.ok ? e.ins.evaluacion.dato : null;
  const textoDoc = evaluacion?.entrenamiento ?? null;
  const palanca = chipDePalanca(e.documento, 'entrenamiento', extras);
  if (!lr.ok) {
    if (!textoDoc) return pilarError('entrenamiento');
    return pilarOk('entrenamiento', recortar(textoDoc, 80), palanca, null, 'No se pudieron leer tus días de entrenar.');
  }
  const resumen = resumenEntreno(lr.dato, e.hoy) ?? (textoDoc ? recortar(textoDoc, 80) : null);
  if (!resumen) {
    return pilarVacio('entrenamiento', 'Todavía no has dicho qué días entrenas.', {
      texto: 'Armar mi plan de entrenar', ruta: RUTAS_PLAN_V4.planEntrenamiento,
    });
  }
  const c = e.dia.conteo.entrenamiento;
  const hoy = c ? (c.titulo ? chipHoy(c.titulo) : c.hayPlan ? chipHoy('descanso') : null) : null;
  const o = objetivoDeRutina(e.documento, lr.dato, e.hoy);
  const porQue = o ? chipPorQue(o.objetivo, `${o.nombre}: ${o.objetivo}`) : palanca;
  return pilarOk('entrenamiento', resumen, porQue, hoy);
}

// --- Sueno -------------------------------------------------------------------

function pilarSueno(e: EntradaPilares, extras: ExtrasPorPilar): PilarV4 | null {
  const ls = e.ins.sueno;
  if (!ls) return null;
  if (!ls.ok) return pilarError('sueno');
  const v = ls.dato;
  const dormir = v?.dormir ?? null;
  const despertar = v?.despertar ?? null;
  if (!dormir && !despertar) {
    return pilarVacio('sueno', 'Todavía no hay una ventana de sueño. Sale de tu test de cronotipo.', {
      texto: 'Ver mi cronotipo', ruta: RUTAS_PLAN_V4.cronotipo,
    });
  }
  const resumen = dormir && despertar
    ? `De ${horaCorta(dormir.hora)} a ${horaCorta(despertar.hora)}`
    : dormir ? `Dormir a las ${horaCorta(dormir.hora)}` : `Despertar a las ${horaCorta(despertar!.hora)}`;
  const hoy = dormir
    ? chipHoy(`a dormir a las ${horaCorta(dormir.hora)}`)
    : chipHoy(`despertar a las ${horaCorta(despertar!.hora)}`);
  let porQue = chipDePalanca(e.documento, 'sueno', extras);
  if (!porQue && (dormir?.origen ?? despertar?.origen) === 'cronotipo') {
    porQue = chipPorQue(
      'tu cronotipo', 'Sale de tu test de cronotipo', [{ texto: 'Ver mi cronotipo', ruta: RUTAS_PLAN_V4.cronotipo }],
    );
  }
  return pilarOk('sueno', resumen, porQue, hoy);
}

// --- Practicas y habitos -----------------------------------------------------

/** Las filas de practicas y habitos de HOY (ids pra: y hab:) que traen hora, por hora. */
function filasConHora(dia: DiaPlan): Array<{ f: FilaPlan; min: number }> {
  const sec = dia.secciones.find((s) => s.key === 'practicas');
  if (!sec || sec.estado !== 'ok') return [];
  const out: Array<{ f: FilaPlan; min: number }> = [];
  for (const f of sec.filas) {
    if (!f.id.startsWith('pra:') && !f.id.startsWith('hab:')) continue;
    const min = parseHHMM(f.cuando);
    if (min !== null) out.push({ f, min });
  }
  return out.sort((a, b) => a.min - b.min);
}

/**
 * "Respiración 4-7-8, 22:00": lo que sigue desde `ahoraMin`. Sin hora actual,
 * lo primero del dia. Si ya paso todo lo que tiene hora, o nada tiene hora,
 * cuantas cosas hay hoy. null si no hay nada.
 */
export function siguienteDeHoy(dia: DiaPlan, total: number, ahoraMin: number | null | undefined): string | null {
  const conHora = filasConHora(dia);
  const sigue = ahoraMin == null ? conHora[0] : conHora.find((x) => x.min >= ahoraMin);
  if (sigue) return `${recortar(sigue.f.titulo, 28)}, ${horaCorta(sigue.f.cuando ?? '')}`;
  return total > 0 ? `${total} en tu día` : null;
}

function pilarPracticas(e: EntradaPilares, extras: ExtrasPorPilar): PilarV4 | null {
  const { practicas: lp, habitos: lh } = e.ins;
  if (!lp && !lh) return null;
  const pFallo = !!lp && !lp.ok;
  const hFallo = !!lh && !lh.ok;
  const pedidas = (lp ? 1 : 0) + (lh ? 1 : 0);
  if ((pFallo ? 1 : 0) + (hFallo ? 1 : 0) === pedidas) return pilarError('practicas');
  const n = lp && lp.ok ? lp.dato.length : 0;
  const m = lh && lh.ok ? lh.dato.length : 0;
  const parcial = pFallo ? 'No se pudieron leer tus prácticas.' : hFallo ? 'No se pudieron leer tus hábitos.' : null;
  if (n + m === 0) {
    if (!parcial) {
      return pilarVacio('practicas', 'No tienes prácticas ni hábitos encendidos.', {
        texto: 'Armar mi día', ruta: RUTAS_PLAN_V4.armar,
      });
    }
    return pilarOk('practicas', pFallo ? 'Sin hábitos encendidos' : 'Sin prácticas encendidas', null, null, parcial);
  }
  const partes: string[] = [];
  if (n > 0) partes.push(plural(n, 'práctica', 'prácticas'));
  if (m > 0) partes.push(plural(m, 'hábito', 'hábitos'));
  const siguiente = siguienteDeHoy(e.dia, n + m, e.ahoraMin ?? null);
  return pilarOk(
    'practicas', partes.join(' · '), chipDePalanca(e.documento, 'practicas', extras),
    siguiente ? chipHoy(siguiente) : null, parcial,
  );
}

/**
 * Los cinco pilares, en su orden. Uno cuya parte no se pidio no viene. Cada
 * uno sale de SUS lecturas: el que fallo dice "No se pudo leer" y los demas
 * siguen.
 */
export function pilaresDelPlan(e: EntradaPilares): PilarV4[] {
  const extras = extrasDelPlan(e.ins);
  const armar: Record<PilarKey, () => PilarV4 | null> = {
    suplementos: () => pilarSuplementos(e, extras),
    alimentacion: () => pilarAlimentacion(e, extras),
    entrenamiento: () => pilarEntreno(e, extras),
    sueno: () => pilarSueno(e, extras),
    practicas: () => pilarPracticas(e, extras),
  };
  const out: PilarV4[] = [];
  for (const k of ORDEN_PILARES) {
    const p = armar[k]();
    if (p) out.push(p);
  }
  return out;
}

/** Los pilares que tienen algo en el plan (los unicos que una palanca puede tocar). */
export function pilaresConPlan(pilares: ReadonlyArray<PilarV4>): PilarKey[] {
  return pilares.filter((p) => p.estado === 'ok').map((p) => p.key);
}

// ---------------------------------------------------------------------------
// 5. Apps recomendadas por tu plan
// ---------------------------------------------------------------------------

/**
 * Practica -> app, por FAMILIA del catalogo (la modalidad no importa: toda
 * respiracion de caja se practica en Respirar). Solo apps del registro; el
 * test lo amarra. Lo que no tiene app (ducha fria, sauna, pasos) no se lista.
 */
export const APP_POR_FAMILIA: Readonly<Record<string, string>> = {
  box_breathing: 'respirar',
  wim_hof: 'respirar',
  respiracion_nocturna: 'respirar',
  apnea_tables: 'respirar',
  nsdr_yoga_nidra: 'meditar',
  binaurales: 'meditar',
  journal: 'journal',
  ayuno: 'ayuno',
  ejercicio_ayuno: 'ayuno',
  hidratacion_matutina: 'hidratacion',
  pantallas_off: 'sueno',
  lentes_azul: 'sueno',
};

/** Practicas sin familia (o con una familia sin app) que si tienen su app. */
export const APP_POR_PRACTICA: Readonly<Record<string, string>> = {
  hidratacion_matutina: 'hidratacion',
  exposicion_solar_matutina: 'sol',
  coherencia_cardiaca_5_5: 'respirar',
  physiological_sigh: 'respirar',
  hiperventilacion_matutina: 'respirar',
  n_back_challenge: 'nback',
  zona_2_aerobica: 'cardio',
  vo2max_training: 'cardio',
  levantamiento_compuesto: 'entrenar',
  recordatorio_dormir: 'sueno',
};

/** Lo ultimo: por categoria del catalogo, en este orden. */
export const APP_POR_CATEGORIA: ReadonlyArray<readonly [string, string]> = [
  ['respiracion', 'respirar'],
  ['contemplativo', 'meditar'],
  ['sueno', 'sueno'],
];

const CATALOGO_POR_LLAVE = new Map(INTERVENTIONS_CATALOG.map((iv) => [iv.key, iv]));

/** La app donde se hace una practica del catalogo; null si no tiene. */
export function appDePractica(key: string): string | null {
  if (APP_POR_PRACTICA[key]) return APP_POR_PRACTICA[key];
  const iv = CATALOGO_POR_LLAVE.get(key);
  if (!iv) return null;
  if (iv.family && APP_POR_FAMILIA[iv.family]) return APP_POR_FAMILIA[iv.family];
  const cats = (iv.categories ?? []) as readonly string[];
  for (const [cat, app] of APP_POR_CATEGORIA) if (cats.includes(cat)) return app;
  return null;
}

export type FuenteApp = 'suplementos' | 'rutina' | 'ayuno' | 'practica' | 'habito';

export interface AppRecomendada {
  appKey: string;
  /** "En tu plan: Magnesio y 5 más". */
  motivo: string;
  fuente: FuenteApp;
  /** De que fila del plan sale (los prefijos de Mi plan: sup:, ent:, ali:, pra:, hab:). */
  itemId: string;
  /** Toca hoy. */
  hoy: boolean;
  /** Minuto del dia en que toca (para ordenar); null = sin hora. */
  orden: number | null;
}

const PRIORIDAD_FUENTE: Readonly<Record<FuenteApp, number>> = {
  suplementos: 0, rutina: 1, ayuno: 2, practica: 3, habito: 4,
};

export const MAX_APPS_RECOMENDADAS = 4;

/** Las partes que appsDelPlan usa: la hilera de Apps pide solo estas. */
export const PARTES_APPS = ['rutinas', 'suplementos', 'practicas', 'habitos', 'evaluacion'] as const;

/**
 * Las apps que tu plan abre, con su motivo. Solo apps del registro que esta
 * cuenta ve sin candado (`apps`: visibleApps). Sin duplicados (gana la mas
 * relevante hoy) y como mucho `max`. Orden: lo de hoy primero; dentro, lo que
 * sigue desde `ahoraMin` por hora, luego lo que no tiene hora, luego lo que ya
 * paso; empates por fuente. Una parte que no se pudo leer no aporta nada:
 * nunca una fila inventada.
 */
export function appsDelPlan(args: {
  ins: InsumosPlan;
  hoy: string;
  apps: ReadonlyArray<{ key: string; bloqueada: boolean }>;
  ahoraMin?: number | null;
  max?: number;
}): AppRecomendada[] {
  const { ins, hoy } = args;
  const abiertas = new Set(args.apps.filter((a) => !a.bloqueada).map((a) => a.key));
  const cands: AppRecomendada[] = [];

  // Suplementos: el plan entero; toca hoy si hoy hay alguna toma.
  if (ins.suplementos?.ok) {
    const plan = suplementosDelPlan(ins.suplementos.dato);
    if (plan.length > 0) {
      const deHoy = plan.filter((r) => r.dose_pattern !== 'semanal' && esDiaProgramado(r.dose_pattern, hoy));
      const ordenes = deHoy.map((r) => momentosDeToma(r).orden).filter((x): x is number => x !== null);
      const primero = (plan[0].name ?? '').trim();
      cands.push({
        appKey: 'suplementos',
        motivo: plan.length === 1 ? `En tu plan: ${primero}` : `En tu plan: ${primero} y ${plan.length - 1} más`,
        fuente: 'suplementos',
        itemId: 'sup:plan',
        hoy: deHoy.length > 0,
        orden: ordenes.length > 0 ? Math.min(...ordenes) : null,
      });
    }
  }

  // Rutinas que asigno el coach.
  if (ins.rutinas?.ok) {
    const rows = ins.rutinas.dato;
    const deHoy = resolverHoy([...rows], hoy).elegida;
    const delCoach = rows.filter((r) => r?.is_active && esRutinaDeCoach(r));
    if (delCoach.length > 0) {
      const fila = deHoy && esRutinaDeCoach(deHoy) ? deHoy : null;
      const cual = fila ?? delCoach[0];
      cands.push({
        appKey: 'entrenar',
        motivo: `En tu plan: ${tituloDeAsignacion(cual)}${fila ? ', hoy' : ''}`,
        fuente: 'rutina',
        itemId: `ent:${cual.id ?? 'coach'}`,
        hoy: fila !== null,
        orden: null,
      });
    }
  }

  // Ventana de alimentacion: el ayuno empieza cuando se cierra.
  if (ins.evaluacion?.ok && ins.evaluacion.dato?.ventana) {
    const v = ins.evaluacion.dato.ventana;
    cands.push({
      appKey: 'ayuno',
      motivo: `En tu plan: ventana de ${horaCorta(v.inicio)} a ${horaCorta(v.fin)}`,
      fuente: 'ayuno',
      itemId: 'ali:ventana',
      hoy: true,
      orden: parseHHMM(v.fin),
    });
  }

  if (ins.practicas?.ok) {
    for (const p of ins.practicas.dato) {
      const app = appDePractica(p.key);
      if (!app) continue;
      cands.push({
        appKey: app, motivo: `En tu plan: ${p.nombre}`, fuente: 'practica', itemId: `pra:${p.key}`,
        hoy: true, orden: parseHHMM(p.hora),
      });
    }
  }

  if (ins.habitos?.ok) {
    for (const h of ins.habitos.dato) {
      if (!h.appKey) continue;
      cands.push({
        appKey: h.appKey, motivo: `En tu plan: ${h.nombre}`, fuente: 'habito', itemId: `hab:${h.key}`,
        hoy: true, orden: parseHHMM(h.hora),
      });
    }
  }

  const ahora = args.ahoraMin ?? null;
  /** 0 = sigue, 1 = sin hora, 2 = ya paso. Sin hora actual, todo lo que tiene hora "sigue". */
  const tramo = (o: number | null): number => (o === null ? 1 : ahora === null || o >= ahora ? 0 : 2);
  const ordenadas = cands
    .filter((c) => abiertas.has(c.appKey))
    .sort((a, b) => (Number(b.hoy) - Number(a.hoy))
      || (tramo(a.orden) - tramo(b.orden))
      || ((a.orden ?? 0) - (b.orden ?? 0))
      || (PRIORIDAD_FUENTE[a.fuente] - PRIORIDAD_FUENTE[b.fuente]));
  const vistas = new Set<string>();
  const out: AppRecomendada[] = [];
  const max = args.max ?? MAX_APPS_RECOMENDADAS;
  for (const c of ordenadas) {
    if (out.length >= max) break;
    if (vistas.has(c.appKey)) continue;
    vistas.add(c.appKey);
    out.push(c);
  }
  return out;
}
