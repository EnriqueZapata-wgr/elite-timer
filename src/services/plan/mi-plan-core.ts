/**
 * mi-plan-core (7-oct-2026, Mi plan). Logica PURA de la pantalla "Mi plan" y
 * de su tarjeta en HOY. Sin react-native ni supabase, para que node la pruebe
 * (`node scripts/run-tests-sin-vitest.js src/services/plan/__tests__/mi-plan-core.test.ts`).
 *
 * POR QUE EXISTE. El dueno probo "Que hacer hoy" (tres habitos elegidos por
 * marcadores fuera de ventana) y pidio otra cosa arriba: un resumen de manual,
 * como se entregan las plataformas, con "Mi plan / Ver mi plan". Y que ver mi
 * plan sea ver que te toca cada dia y que tanto se puede reprogramar.
 *
 * Que decide aqui:
 *  1. La semana de lunes a domingo en fechas LOCALES (regla 3 de la casa).
 *  2. El dia: Entrenamiento, Alimentacion, Suplementos, Practicas y habitos y
 *     Sueno, en ese orden, cada fila con que, cuando y de quien es.
 *  3. De quien es cada cosa, con tres etiquetas y solo tres (decision del
 *     dueno, 7-oct-2026): "Lo puedes mover" (lo propio abre su editor de
 *     siempre), "Lo fijo {coach}" (no hay camino de escritura nuevo: se pausa
 *     donde la pausa ya existe o se le escribe) y "ARGOS propone" (la
 *     propuesta que ya vive en /ordenar-dia; nada cambia sin que acepte).
 *  4. La linea de la tarjeta de HOY, solo con las partes que existen.
 *
 * Reglas de honestidad (7 y 13 de la casa):
 *  - Cada lectura es independiente. Una que falla marca SU seccion con "No se
 *    pudo leer"; no borra las demas ni se vuelve un cero.
 *  - Lo que no se pudo leer nunca se cuenta: ni "0 suplementos" ni "todavia
 *    no tienes plan". Sin plan solo se dice cuando TODO se leyo y esta vacio.
 *  - La app atiende tres niveles (cuenta general, cliente con programa,
 *    cliente con evaluacion Elite) con las mismas tablas: aqui no hay ramas
 *    por nivel, hay "lo que esta cuenta tiene".
 *  - Nada se inventa: una hora que nadie fijo no se pinta, y una fila sin
 *    puerta para moverla no lleva la etiqueta "Lo puedes mover".
 *
 * 8-oct-2026 (revisión en frío). Lo que cambio, y por que:
 *  - "Lo puedes mover" se le quito a lo que no tiene editor: el plan de
 *    alimentacion propio (Nutricion solo lo muestra) y las horas de sueno que
 *    salen del cronotipo (alla solo se repite el test).
 *  - Los estados de los habitos sin leer ya no son "todos activos": la parte
 *    de habitos cae en "No se pudo leer" y la tarjeta no cuenta lo que no
 *    pudo clasificar.
 *  - Cada lectura corre contra un tope (conTope, juntarLecturas): una que se
 *    cuelga marca SU parte y las demas llegan.
 *  - La lista de habitos no repite una llave y pasa la misma compuerta con la
 *    que HOY decide si ofrece el registro del ciclo.
 *  - Las horas de los habitos llegan aqui YA leidas (horasDeHabitos): el
 *    nombre crudo de esa columna de preferencias vive solo en el servicio.
 *
 * 8-oct-2026 (nivel 2):
 *  - Una practica que el coach asigno desde el programa (assigned_by,
 *    migracion 329) es "Lo fijó {coach}": se consulta y se pausa, su hora la
 *    ajusta el coach. Antes de la 329 ninguna llega marcada y todas siguen
 *    siendo "Lo puedes mover", como hoy. La ficha de la practica usa la misma
 *    decision (ajustesDePractica).
 *  - Las palabras que nombran el documento ("tu evaluación" o "tu programa")
 *    salen de la voz del documento cargado (voz-programa-core). Si no se sabe
 *    de que tipo es, se dice "tu programa", que es verdad para los dos
 *    niveles; nunca "Elite".
 */
import { parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import {
  DIA_LABELS, esRutinaDeCoach, resolverHoy, tituloDeAsignacion,
  type AsignacionRow,
} from '@/src/services/fitness/plan-semanal-core';
import { HORA_POR_TOMA, TOMA_POR_TIMING, parseHHMM } from '@/src/services/agenda-core';
import { esDelCoach, esDiaProgramado, esPlan } from '@/src/services/supplements/adherencia-core';
import { MOMENTO_COMIDA_LABEL, type ComidaPlan } from '@/src/services/nutrition/plan-comidas-core';
import type { AvancePrograma } from '@/src/services/elite/programa-elite-core';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';
import {
  nombreVisibleDelPlan, VOZ_ELITE, vozDeDocumento, type VozPrograma,
} from '@/src/services/elite/voz-programa-core';
import { seccionTieneContenido } from '@/src/services/elite/mi-programa-core';
import { detallePuertas } from '@/src/services/hoy/elite-hoy-core';
import { TAREA_TIME } from '@/src/services/hoy/tareas-core';
import { parseHabitTimeEntry, resolverHora, type HabitTimeEntry } from '@/src/services/hoy/habit-times-core';
import { renglonesDeHoy } from '@/src/services/hoy/techo-core';
import { estadosPorKey, type HabitEstado, type HabitEstadoRow } from '@/src/services/hoy/habit-states-core';
import { FEMALE_ONLY_ELECTRONS } from '@/src/services/hoy/day-booleans';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { appForElectron, electronsForApp } from '@/src/constants/electron-app-bridge';
import {
  anchorTimes, assignInterventionTimes, type ChronoRawScores,
} from '@/src/services/interventions/intervention-agenda-core';
import {
  esPracticaAsignada, resolveRows, type UserInterventionRow,
} from '@/src/services/interventions/intervention-service-core';

// ---------------------------------------------------------------------------
// 0. Lecturas y utilidades
// ---------------------------------------------------------------------------

/**
 * Por que no se pudo leer. 'formato' = la fila existe y esta version de la
 * app no la entiende: reintentar no la arregla, asi que no se ofrece.
 */
export type MotivoFallo = 'lectura' | 'formato';

/** Una lectura que DICE si fallo. `ok:false` nunca se pinta como vacio. */
export type Lectura<T> = { ok: true; dato: T } | { ok: false; motivo?: MotivoFallo };

export function lecturaOk<T>(dato: T): Lectura<T> {
  return { ok: true, dato };
}

export const LECTURA_FALLIDA: { ok: false } = { ok: false };

/** 8-oct-2026 (revisión en frío): se leyo y no se entiende. No es un fallo de red. */
export const LECTURA_ILEGIBLE: { ok: false; motivo: 'formato' } = { ok: false, motivo: 'formato' };

// --- Topes de lectura (8-oct-2026, revisión en frío) -------------------------

/**
 * Cuanto se espera a UNA parte. Antes la lectura completa esperaba a la mas
 * lenta sin limite: una sola consulta colgada dejaba la pantalla en blanco
 * aunque las demas ya hubieran llegado. Va por debajo del tope de la
 * pantalla (10 s) para que lo leido llegue antes de que ella se rinda.
 */
export const TOPE_PARTE_MS = 8000;

/**
 * Las preferencias y el cronotipo alimentan varias partes. Su tope es mas
 * corto que el de una parte: si se cuelgan, cada parte todavia alcanza a
 * armarse con "eso no se pudo leer" (una practica conserva la hora que la
 * persona le puso) en vez de caerse entera.
 */
export const TOPE_COMPARTIDA_MS = 6000;

/** El reloj, inyectable para probar el tope sin esperar segundos de verdad. */
export interface Reloj {
  poner: (fn: () => void, ms: number) => unknown;
  quitar: (id: unknown) => void;
}

const RELOJ_REAL: Reloj = {
  poner: (fn, ms) => setTimeout(fn, ms),
  quitar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * `lectura` contra un tope: gana lo primero que pase. Nunca rechaza: si la
 * lectura lanza, tambien entrega `alVencer`. Lo que llegue despues del tope
 * se descarta (no escribe sobre lo ya entregado).
 */
export function conTope<T>(lectura: Promise<T>, ms: number, alVencer: T, reloj: Reloj = RELOJ_REAL): Promise<T> {
  return new Promise<T>((resolve) => {
    let cerrado = false;
    let id: unknown = null;
    const cerrar = (v: T) => {
      if (cerrado) return;
      cerrado = true;
      reloj.quitar(id);
      resolve(v);
    };
    id = reloj.poner(() => cerrar(alVencer), ms);
    lectura.then(cerrar, () => cerrar(alVencer));
  });
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** "a", "a y b", "a, b y c". */
function unirConY(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

function mayusculaInicial(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** 'H:MM', 'HH:MM' o 'HH:MM:SS' de la base -> 'HH:MM'; null si no es una hora. */
export function horaLimpia(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function numeroPositivo(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// 1. La semana, en fechas locales
// ---------------------------------------------------------------------------

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** Inicial de cada dia, 0 = domingo (mismo convenio que Date.getDay). */
const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;

/** Suma dias a una fecha local 'YYYY-MM-DD' sin pasar por UTC. */
export function sumarDias(fecha: string, dias: number): string {
  const d = parseLocalDate(fecha);
  d.setDate(d.getDate() + dias);
  return toLocalDateString(d);
}

/**
 * Lunes a domingo de la semana que contiene `fecha`. La semana del usuario
 * empieza en lunes (como DIAS_ORDEN_UI): el domingo CIERRA la semana, no abre
 * la siguiente. Fecha que no es 'YYYY-MM-DD' -> [] (la pantalla no pinta una
 * tira inventada).
 */
export function semanaDe(fecha: string): string[] {
  if (!RE_FECHA.test(fecha)) return [];
  const base = parseLocalDate(fecha);
  if (Number.isNaN(base.getTime())) return [];
  const desdeLunes = (base.getDay() + 6) % 7;
  const lunes = sumarDias(fecha, -desdeLunes);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export interface DiaSemana {
  fecha: string;
  /** "L", "M", ... */
  inicial: string;
  /** "Lunes" */
  nombre: string;
  /** Dia del mes. */
  numero: number;
  esHoy: boolean;
  /** Hay entrenamiento ese dia. null = las rutinas no se pidieron o no se pudieron leer. */
  entrena: boolean | null;
}

/** La tira de la semana de `hoy`, con el punto de "ese dia entrenas" cuando se sabe. */
export function tiraSemana(hoy: string, rutinas?: Lectura<AsignacionRow[]>): DiaSemana[] {
  return semanaDe(hoy).map((fecha) => {
    const d = parseLocalDate(fecha);
    const dow = d.getDay();
    return {
      fecha,
      inicial: INICIAL_DIA[dow],
      nombre: DIA_LABELS[dow],
      numero: d.getDate(),
      esHoy: fecha === hoy,
      entrena: rutinas && rutinas.ok ? resolverHoy(rutinas.dato, fecha).elegida !== null : null,
    };
  });
}

/** "Hoy, miércoles 7 de octubre" o "Jueves 8 de octubre". */
export function tituloDia(fecha: string, hoy: string): string {
  if (!RE_FECHA.test(fecha)) return '';
  const d = parseLocalDate(fecha);
  if (Number.isNaN(d.getTime())) return '';
  const texto = `${DIA_LABELS[d.getDay()].toLowerCase()} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  return fecha === hoy ? `Hoy, ${texto}` : mayusculaInicial(texto);
}

/**
 * "Semana 3 de 12" para la cabecera. null cuando no hay avance que decir
 * (cuenta sin programa, o fecha de inicio ilegible): la cabecera no inventa
 * una semana.
 */
export function lineaSemanaPrograma(a: AvancePrograma | null | undefined): string | null {
  if (!a) return null;
  if (a.completado) return `Programa de ${a.semanasTotales} semanas completado`;
  return `Semana ${a.semana} de ${a.semanasTotales}`;
}

// ---------------------------------------------------------------------------
// 2. De quien es cada cosa
// ---------------------------------------------------------------------------

export type DuenoPlan = 'tuyo' | 'coach' | 'argos';

export const ETIQUETA_TUYO = 'Lo puedes mover';
export const ETIQUETA_ARGOS = 'ARGOS propone';

/** "Lo fijó Enrique". Sin nombre legible, "Lo fijó tu coach" (nunca un nombre inventado). */
export function etiquetaCoach(coach: string | null | undefined): string {
  const n = (coach ?? '').trim();
  return `Lo fijó ${n || 'tu coach'}`;
}

/**
 * Lo que la ficha de una practica deja hacer (8-oct-2026, nivel 2). Regla del
 * dueno "lo suyo sí, lo tuyo no": la que asigno el coach desde el programa se
 * consulta y se pausa (y se reanuda); su hora y su indicacion las ajusta el
 * coach, y no se descarta desde la app. Una propia, o una que la app no puede
 * saber si es asignada (base sin la 329, fila sin leer), se edita como
 * siempre.
 */
export interface AjustesPractica {
  asignada: boolean;
  /** "Lo fijó Enrique" en una asignada; null en una propia. */
  etiqueta: string | null;
  /** Se ofrece el editor de hora y notas. */
  editaAjustes: boolean;
  /** Se ofrece Descartar. */
  puedeDescartar: boolean;
  /** Lo que se dice en lugar del editor; null en una propia. */
  avisoAjustes: string | null;
}

export function ajustesDePractica(
  row: { assigned_by?: string | null } | null | undefined,
  coach: string | null | undefined,
): AjustesPractica {
  if (!esPracticaAsignada(row)) {
    return { asignada: false, etiqueta: null, editaAjustes: true, puedeDescartar: true, avisoAjustes: null };
  }
  const quien = (coach ?? '').trim() || 'tu coach';
  return {
    asignada: true,
    etiqueta: etiquetaCoach(coach),
    editaAjustes: false,
    puedeDescartar: false,
    avisoAjustes: `Esta práctica es parte de tu programa. Su hora y su indicación las ajusta ${quien}; si no te acomodan, platícalo con ${quien}. La puedes pausar cuando quieras.`,
  };
}

/**
 * El aviso de la agenda cuando se toca "Cambiar hora" en una practica que
 * asigno el coach (8-oct-2026, nivel 2): en vez de la rueda, se dice quien la
 * ajusta y se ofrece abrir su ficha, donde se pausa.
 */
export function avisoHoraDePracticaAsignada(coach: string | null | undefined): { titulo: string; cuerpo: string } {
  const quien = (coach ?? '').trim() || 'tu coach';
  return {
    titulo: `Su hora la ajusta ${quien}`,
    cuerpo: `Esta práctica es parte de tu programa. Si la hora no te acomoda, platícalo con ${quien}. En su ficha la puedes pausar.`,
  };
}

/**
 * 8-oct-2026 (nivel 2): la agenda no pudo leer la ficha de la practica antes
 * de abrir un editor. No se sabe si la hora es suya: se dice y no se abre.
 */
export const PRACTICA_NO_LEIDA = {
  titulo: 'No se pudo leer esta práctica',
  cuerpo: 'Revisa tu conexión y vuelve a intentar.',
} as const;

export interface LineaAjuste {
  dueno: DuenoPlan;
  etiqueta: string;
  texto: string;
}

/**
 * El bloque "Como se ajusta tu plan": una linea por etiqueta que la cuenta
 * puede ver. `coach` es el nombre de quien fijo lo de la semana (null = no se
 * sabe o son varios: "tu coach").
 *
 * 8-oct-2026 (revisión en frío): `hayDeCoach` decide si la linea del coach
 * se pinta. Antes salia siempre, y a una cuenta sin nada asignado se le
 * explicaba una etiqueta que nunca iba a ver ("Lo fijó tu coach").
 */
export function comoSeAjusta(coach: string | null | undefined, hayDeCoach: boolean): LineaAjuste[] {
  const lineas: LineaAjuste[] = [
    { dueno: 'tuyo', etiqueta: ETIQUETA_TUYO, texto: 'Es tuyo: cambias su hora o su día cuando quieras.' },
  ];
  if (hayDeCoach) {
    lineas.push({
      dueno: 'coach',
      etiqueta: etiquetaCoach(coach),
      texto: 'Desde aquí no se mueve: lo pausas donde ya existe la pausa o lo platicas con quien lo fijó.',
    });
  }
  lineas.push({
    dueno: 'argos',
    etiqueta: ETIQUETA_ARGOS,
    // 8-oct-2026 (revisión en frío): decia que la graduacion se proponia "en
    // HOY". La propuesta completa (que dejar, que graduar, que descansar)
    // vive en /ordenar-dia, que es a donde lleva la fila "ARGOS propone".
    texto: 'ARGOS lee lo que sí haces y propone qué dejar, qué graduar y qué descansar. Lo ves en Ordenar mi día. Nada cambia hasta que aceptas.',
  });
  return lineas;
}

// ---------------------------------------------------------------------------
// 3. A donde lleva cada fila
// ---------------------------------------------------------------------------

/**
 * Todas las rutas fijas que abre Mi plan. Son editores y pantallas que YA
 * existen: Mi plan no escribe nada, lleva al lugar donde se cambia. El test
 * cruza cada una contra los archivos de app/: ninguna inventada y ninguna
 * que sea un simple reenvio a otra pantalla.
 *
 * Nota para el censo de rutas (scripts/censo-rutas.js): esta tabla NO es una
 * puerta. El censo acredita una ruta cuando la ve junto a una forma de
 * navegar, y este comentario evita a proposito esas formas: las puertas de
 * /mi-plan son la tarjeta de HOY y la fila de MI PROGRAMA, que la empujan con
 * su literal. Si esta tabla contara, la pantalla seria su propia puerta.
 */
export const RUTAS_MI_PLAN = {
  miPlan: '/mi-plan',
  // 8-oct-2026 (revisión en frío): '/agenda' salio de esta tabla. La pantalla
  // tenia dos enlaces seguidos a la agenda ("Ver todo mi día" de la tarjeta
  // de hoy y uno propio debajo); se quedo el de la tarjeta, que no pasa por aqui.
  planEntrenamiento: '/plan-entrenamiento',
  entrenar: '/fitness-hub',
  misRutinas: '/my-routines',
  nutricion: '/nutrition',
  suplementos: '/supplements',
  ordenarDia: '/ordenar-dia',
  sueno: '/sleep',
  cronotipo: '/tests/resultado/cronotipo',
  armar: '/packs/armar',
} as const;

export type RutaMiPlan = (typeof RUTAS_MI_PLAN)[keyof typeof RUTAS_MI_PLAN];

export type DestinoPlan =
  | { tipo: 'ruta'; ruta: RutaMiPlan }
  /** Una seccion de la evaluacion Elite (/salud/evaluacion-elite?seccion=). */
  | { tipo: 'evaluacion'; seccion: 'alimentacion' | 'entrenamiento' }
  /** La ficha del habito en el Centro (/centro/{appKey}): ahi vive su hora y su meta. */
  | { tipo: 'habito'; appKey: string }
  /** La ficha de la practica (/salud/intervenciones/{key}): hora, pausa. */
  | { tipo: 'practica'; key: string };

function aRuta(ruta: RutaMiPlan): DestinoPlan {
  return { tipo: 'ruta', ruta };
}

// ---------------------------------------------------------------------------
// 4. Los insumos: filas planas, una lectura por parte
// ---------------------------------------------------------------------------

/** Lo que Mi plan necesita de una ficha de user_supplements. */
export interface SuplementoPlanRow {
  id: string;
  name: string | null;
  timing?: string | null;
  dose_times?: unknown;
  dose_pattern?: string | null;
  source?: string | null;
  is_plan?: boolean | null;
  is_active?: boolean | null;
}

export interface PracticaPlanRow {
  key: string;
  nombre: string;
  /** 'HH:MM' o null cuando no hay con que saberla. */
  hora: string | null;
  /** La hora la puso la persona (custom_time); si no, sale de su horario. */
  horaTuya: boolean;
  /**
   * 8-oct-2026 (nivel 2): la asigno el coach desde el programa
   * (esPracticaAsignada). Ausente o false = es de la persona, como siempre.
   * En una asignada `horaTuya` solo dice que la hora viene de custom_time.
   */
  deCoach?: boolean;
}

export interface HabitoPlanRow {
  key: string;
  nombre: string;
  hora: string | null;
  /** Su hora la marca la ventana de sol de cada dia: aqui no hay una fija. */
  segunSol: boolean;
  /** App del Centro donde vive su ficha; null = habito sin app. */
  appKey: string | null;
  /** Su ficha tiene editor de hora (habitoEditaHora). Sin editor no se promete moverlo. */
  editaHora: boolean;
}

export interface PlanAlimentacionIn {
  nombre: string | null;
  /** Metas ya en texto (metasDelPlan): "2200 kcal", "150 g de proteína". */
  metas: string[];
  comidas: ComidaPlan[];
  /** true cuando lo creo la propia persona: no es de un coach. */
  propio: boolean;
  coachNombre: string | null;
  /** El plan fija ese numero: la meta propia del mismo nutriente no se repite. */
  fijaProteina: boolean;
  fijaAgua: boolean;
}

export interface MetasPropiasIn {
  /** null = la persona no la fijo. Nunca el default de la app. */
  proteina_g: number | null;
  agua_ml: number | null;
}

export type OrigenHora = 'tuyo' | 'cronotipo';

export interface VentanaSuenoIn {
  dormir: { hora: string; origen: OrigenHora } | null;
  despertar: { hora: string; origen: OrigenHora } | null;
}

/** Lo que la evaluacion Elite aporta al plan de la semana. */
export interface EvaluacionPlanIn {
  /** Segunda linea de su plan de entrenamiento; null = la seccion viene vacia. */
  entrenamiento: string | null;
  ventana: { inicio: string; fin: string } | null;
  /** Fila de alimentacion de la evaluacion; null = nada que abrir. */
  alimentacion: { titulo: string; detalle: string | null } | null;
  /**
   * Los nombres de las rutinas ejecutables del documento. La carga las vuelve
   * rutinas reales con ese mismo nombre y las agenda; sirven para no decir
   * dos veces lo mismo el dia que ya toca una de ellas. Opcional: [] si falta.
   */
  rutinas?: string[];
  /**
   * 8-oct-2026 (nivel 2): las palabras del documento (vozDeDocumento).
   * Ausente = VOZ_ELITE, lo que la pantalla decia antes del nivel 2.
   */
  voz?: VozPrograma;
}

/**
 * Cada parte es una lectura independiente. `undefined` = no se pidio (la
 * tarjeta de HOY solo pide lo que su linea necesita); `{ok:false}` = no se
 * pudo leer.
 */
export interface InsumosPlan {
  rutinas?: Lectura<AsignacionRow[]>;
  /** id del coach -> su primer nombre. Fail-soft: sin entrada, "tu coach". */
  coachPorId?: Readonly<Record<string, string>>;
  suplementos?: Lectura<SuplementoPlanRow[]>;
  practicas?: Lectura<PracticaPlanRow[]>;
  habitos?: Lectura<HabitoPlanRow[]>;
  planAlimentacion?: Lectura<PlanAlimentacionIn | null>;
  metas?: Lectura<MetasPropiasIn>;
  sueno?: Lectura<VentanaSuenoIn | null>;
  evaluacion?: Lectura<EvaluacionPlanIn | null>;
}

export type ParteKey = Exclude<keyof InsumosPlan, 'coachPorId'>;

export type SeccionKey = 'entrenamiento' | 'alimentacion' | 'suplementos' | 'practicas' | 'sueno';

/** El orden de la pantalla (decision del dueno). */
export const ORDEN_SECCIONES: readonly SeccionKey[] = [
  'entrenamiento', 'alimentacion', 'suplementos', 'practicas', 'sueno',
];

export const TITULO_SECCION: Readonly<Record<SeccionKey, string>> = {
  entrenamiento: 'ENTRENAMIENTO',
  alimentacion: 'ALIMENTACIÓN',
  suplementos: 'SUPLEMENTOS',
  practicas: 'PRÁCTICAS Y HÁBITOS',
  sueno: 'SUEÑO',
};

/** Que lecturas arman cada seccion: "Reintentar" relee solo esas. */
export const PARTES_DE_SECCION: Readonly<Record<SeccionKey, readonly ParteKey[]>> = {
  entrenamiento: ['rutinas'],
  alimentacion: ['planAlimentacion', 'metas'],
  suplementos: ['suplementos'],
  practicas: ['practicas', 'habitos'],
  sueno: ['sueno'],
};

/** Lo que la linea de la tarjeta de HOY necesita (sin sueno ni evaluacion). */
export const PARTES_RESUMEN: readonly ParteKey[] = [
  'rutinas', 'suplementos', 'practicas', 'habitos', 'planAlimentacion',
];

export const PARTES_TODAS: readonly ParteKey[] = [
  'rutinas', 'suplementos', 'practicas', 'habitos', 'planAlimentacion', 'metas', 'sueno', 'evaluacion',
];

/**
 * Junta una relectura con lo que ya se veia. Regla 13: un fallo no borra lo
 * ya leido (se sirve lo visto y el siguiente foco reintenta); una lectura
 * buena siempre gana.
 */
export function fusionarInsumos(prev: InsumosPlan, nuevo: InsumosPlan): InsumosPlan {
  const out: InsumosPlan = { ...prev };
  for (const k of PARTES_TODAS) {
    const n = nuevo[k];
    if (n === undefined) continue;
    const p = prev[k];
    if (!n.ok && p && p.ok) continue;
    (out as Record<ParteKey, unknown>)[k] = n;
  }
  if (nuevo.coachPorId) out.coachPorId = { ...(prev.coachPorId ?? {}), ...nuevo.coachPorId };
  return out;
}

/**
 * De una lectura que acaba de llegar, deja solo las partes que nadie volvio a
 * pedir despues (8-oct-2026, segunda revisión en frío). fusionarInsumos cuida
 * que un fallo no borre algo bueno, pero no sabe de orden: una lectura
 * completa lenta que aterriza DESPUES de una relectura de una sola parte
 * (pausaste una practica aqui mismo) pintaba encima el dato viejo. Cada
 * lectura toma un turno y lo anota en sus partes; al llegar, solo escribe las
 * que siguen siendo suyas.
 */
export function partesVigentes(
  leido: InsumosPlan,
  ultimoTurno: Readonly<Partial<Record<ParteKey, number>>>,
  turno: number,
): InsumosPlan {
  const out: InsumosPlan = { ...leido };
  for (const k of PARTES_TODAS) {
    if (leido[k] !== undefined && ultimoTurno[k] !== turno) delete (out as Record<string, unknown>)[k];
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. De la base a filas planas (derivaciones puras que el servicio usa)
// ---------------------------------------------------------------------------

export interface CronotipoIn {
  wake_time: string | null;
  sleep_time: string | null;
  chronotype: string | null;
  raw_scores: ChronoRawScores;
}

/** Las metas que la persona fijo. Lo que no fijo queda en null: el default de la app no es suyo. */
export function metasDeGoals(goals: unknown): MetasPropiasIn {
  const g = goals && typeof goals === 'object' ? (goals as Record<string, unknown>) : {};
  return { proteina_g: numeroPositivo(g.protein_goal_g), agua_ml: numeroPositivo(g.water_goal_ml) };
}

/**
 * La ventana de sueno. Manda lo que la persona dijo (goals.wake_time y
 * goals.sleep_time, las horas del armado de su dia) y despues su cronotipo,
 * la misma precedencia con la que HOY compila el dia.
 *
 * Fallos: si las preferencias no se pudieron leer no se sabe si hay una hora
 * suya que mande, asi que no se sirve la del cronotipo como si fuera la
 * vigente. Y si falta alguna hora y el cronotipo no se pudo leer, tampoco.
 * `ok` con null = se leyo todo y no hay ventana: NO se cae al 07:00 a 23:00.
 */
export function ventanaDeSueno(
  goals: Lectura<unknown>,
  chrono: Lectura<CronotipoIn | null>,
): Lectura<VentanaSuenoIn | null> {
  if (!goals.ok) return LECTURA_FALLIDA;
  const g = goals.dato && typeof goals.dato === 'object' ? (goals.dato as Record<string, unknown>) : {};
  const gDespertar = horaLimpia(g.wake_time);
  const gDormir = horaLimpia(g.sleep_time);
  if (gDespertar && gDormir) {
    return lecturaOk({
      despertar: { hora: gDespertar, origen: 'tuyo' },
      dormir: { hora: gDormir, origen: 'tuyo' },
    });
  }
  if (!chrono.ok) return LECTURA_FALLIDA;
  const cDespertar = horaLimpia(chrono.dato?.wake_time);
  const cDormir = horaLimpia(chrono.dato?.sleep_time);
  const despertar: VentanaSuenoIn['despertar'] = gDespertar
    ? { hora: gDespertar, origen: 'tuyo' }
    : cDespertar ? { hora: cDespertar, origen: 'cronotipo' } : null;
  const dormir: VentanaSuenoIn['dormir'] = gDormir
    ? { hora: gDormir, origen: 'tuyo' }
    : cDormir ? { hora: cDormir, origen: 'cronotipo' } : null;
  if (!despertar && !dormir) return lecturaOk(null);
  return lecturaOk({ despertar, dormir });
}

export interface PrefsHabitosIn {
  booleans: string[];
  quants: string[];
  /**
   * La hora que la persona le fijo a cada habito, YA leida (horasDeHabitos):
   * llave -> hora fija 'HH:MM' o regla anclada. 8-oct-2026 (revisión en frío):
   * antes llegaba aqui el objeto crudo de preferencias; ahora lo crudo se
   * queda en el servicio y el core solo ve entradas validas.
   */
  horas: Readonly<Record<string, HabitTimeEntry>>;
  /** goals.wake_time / goals.sleep_time tal cual. */
  wakeTime: unknown;
  sleepTime: unknown;
}

/**
 * De las horas crudas de preferencias a entradas validas, con el lector de la
 * casa (parseHabitTimeEntry): una entrada puede ser hora fija o regla, y lo
 * que no es ninguna de las dos se ignora (manda la hora canonica del habito).
 */
export function horasDeHabitos(crudo: unknown): Record<string, HabitTimeEntry> {
  const out: Record<string, HabitTimeEntry> = {};
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return out;
  for (const [llave, valor] of Object.entries(crudo as Record<string, unknown>)) {
    const entrada = parseHabitTimeEntry(valor);
    if (entrada !== null) out[llave] = entrada;
  }
  return out;
}

/**
 * La compuerta con la que HOY decide si ofrece un habito que no es para
 * todas las personas (day-compiler: FEMALE_ONLY_ELECTRONS y el modo del
 * Ciclo). Los dos datos se leen de donde los lee HOY. null = no se sabe.
 */
export interface GateHabitos {
  /** client_profiles.biological_sex. */
  sexoBiologico: string | null;
  /** user_app_modes.mode de la app 'ciclo' ('acompanante' = el calendario es de otra persona). */
  modoCiclo: string | null;
}

/** Sin dato no se asume nada: el habito con compuerta NO se lista (igual que HOY). */
export const GATE_DESCONOCIDO: GateHabitos = { sexoBiologico: null, modoCiclo: null };

/** Alguna llave encendida necesita la compuerta: solo entonces el servicio la lee. */
export function necesitaGate(prefs: Pick<PrefsHabitosIn, 'booleans' | 'quants'>): boolean {
  return [...prefs.booleans, ...prefs.quants].some((k) => FEMALE_ONLY_ELECTRONS.has(k));
}

function pasaGate(key: string, gate: GateHabitos): boolean {
  // Las dos reglas de day-compiler, tal cual.
  if (FEMALE_ONLY_ELECTRONS.has(key) && gate.sexoBiologico !== 'female') return false;
  if (key === 'period_log' && gate.modoCiclo === 'acompanante') return false;
  return true;
}

/**
 * ¿La hora de este habito se puede cambiar desde la app? (8-oct-2026, segunda
 * revisión en frío). El unico editor de hora es el de su ficha del Centro, y
 * la ficha solo lo pinta cuando la app tiene UN electron con hora canonica
 * (la misma cuenta que hace app/centro/[appKey].tsx). Un habito sin app
 * (ducha fria, sin alcohol, pasos...) o con ficha sin ese editor (ayuno,
 * glucosa, cetonas) no tiene donde moverse: decirle "Lo puedes mover" era
 * prometer un editor que no existe.
 */
export function habitoEditaHora(key: string): boolean {
  const app = appForElectron(key as ElectronSource);
  if (!app) return false;
  const conHora = electronsForApp(app).filter((src) => TAREA_TIME[src]);
  return conHora.length === 1 && conHora[0] === key;
}

/**
 * Los habitos encendidos con su hora. La lista es la MISMA de HOY y de
 * /ordenar-dia (renglonesDeHoy): si aqui dijera otro numero, la persona
 * tendria dos verdades.
 *
 * La hora:
 *  - fija ('HH:MM' que la persona eligio): tal cual.
 *  - regla anclada a su despertar o dormir: se resuelve contra su horario
 *    (lo que dijo, despues su cronotipo, despues 07:00 a 23:00, que es lo que
 *    HOY usa). Si el cronotipo NO se pudo leer y la persona no dijo sus
 *    horas, ese horario no se sabe y la fila va sin hora.
 *  - sin entrada: la canonica del habito (la de la lente Agenda).
 *  - el sol sin hora fija: la marca la ventana de UV de cada dia; aqui no hay
 *    una hora que prometer (`segunSol`).
 *
 * 8-oct-2026 (revisión en frío):
 *  - una llave que vive en las dos listas de preferencias sale UNA vez (antes
 *    salia dos: llave de React repetida y un habito de mas en la cuenta).
 *  - un habito con compuerta (el registro del ciclo) solo se lista si pasa la
 *    de HOY. Sin `gate` no se sabe el sexo y NO se lista: nunca se asume.
 */
export function habitosDePrefs(
  prefs: PrefsHabitosIn,
  estados: Record<string, HabitEstado>,
  chrono: Lectura<CronotipoIn | null>,
  gate: GateHabitos = GATE_DESCONOCIDO,
): HabitoPlanRow[] {
  const despertar = horaLimpia(prefs.wakeTime) ?? (chrono.ok ? horaLimpia(chrono.dato?.wake_time) ?? '07:00' : null);
  const dormir = horaLimpia(prefs.sleepTime) ?? (chrono.ok ? horaLimpia(chrono.dato?.sleep_time) ?? '23:00' : null);
  const out: HabitoPlanRow[] = [];
  const llaves = new Set(renglonesDeHoy({ booleans: prefs.booleans, quants: prefs.quants }, estados));
  for (const key of llaves) {
    if (!pasaGate(key, gate)) continue;
    const meta = (ELECTRON_WEIGHTS as Record<string, { name: string } | undefined>)[key];
    // Una llave que el catalogo no conoce no tiene nombre que pintar.
    if (!meta) continue;
    const entrada: HabitTimeEntry | null = Object.prototype.hasOwnProperty.call(prefs.horas, key) ? prefs.horas[key] : null;
    let hora: string | null = null;
    let segunSol = false;
    if (typeof entrada === 'string') {
      hora = horaLimpia(entrada);
    } else if (entrada) {
      if (entrada.ancla === 'uv') segunSol = true;
      else if (despertar && dormir) hora = resolverHora(entrada, { despertar, dormir, uvInicio: null }).time;
    } else if (key === 'sunlight') {
      segunSol = true;
    } else {
      hora = TAREA_TIME[key] ?? null;
    }
    out.push({
      key, nombre: meta.name, hora, segunSol,
      appKey: appForElectron(key as ElectronSource),
      editaHora: habitoEditaHora(key),
    });
  }
  return out;
}

/**
 * La parte de habitos, de sus lecturas a su desenlace (8-oct-2026, revisión
 * en frío). Vive aqui y no en el servicio para que la regla tenga test:
 *  - preferencias sin leer: no se sabe que tiene encendido. Fallo.
 *  - estados sin leer (`null`): no se sabe que esta en reposo o graduado.
 *    Antes eso se trataba como "todos activos" y la pantalla listaba (y la
 *    tarjeta contaba) habitos que la persona ya habia dejado. Fallo tambien:
 *    la seccion dice "No se pudo leer" con Reintentar.
 */
export function habitosDeLecturas(
  prefs: Lectura<PrefsHabitosIn>,
  estados: HabitEstadoRow[] | null,
  chrono: Lectura<CronotipoIn | null>,
  gate: GateHabitos = GATE_DESCONOCIDO,
): Lectura<HabitoPlanRow[]> {
  if (!prefs.ok || estados === null) return LECTURA_FALLIDA;
  return lecturaOk(habitosDePrefs(prefs.dato, estadosPorKey(estados), chrono, gate));
}

/**
 * Las practicas encendidas con su hora, con la MISMA regla que las manda a la
 * agenda (assignInterventionTimes): la hora que la persona puso manda, y lo
 * demas sale de su cronotipo. Si el cronotipo no se pudo leer, solo se pinta
 * la hora que ella puso; la otra no se sabe.
 */
export function practicasDeFilas(
  rows: ReadonlyArray<UserInterventionRow>,
  chrono: Lectura<CronotipoIn | null>,
): PracticaPlanRow[] {
  const activas = resolveRows(rows.filter((r) => r?.status === 'active'));
  const horas = chrono.ok
    ? assignInterventionTimes(
      activas,
      anchorTimes(
        { wake_time: chrono.dato?.wake_time ?? null, sleep_time: chrono.dato?.sleep_time ?? null },
        chrono.dato?.chronotype ?? null,
        chrono.dato?.raw_scores ?? null,
      ),
    )
    : null;
  return activas.map((iv) => {
    const tuya = horaLimpia(iv.row.custom_time);
    return {
      key: iv.row.intervention_key,
      nombre: iv.def.name,
      hora: tuya ?? (horas ? horaLimpia(horas.get(iv.row.id)) : null),
      horaTuya: tuya !== null,
      deCoach: esPracticaAsignada(iv.row),
    };
  });
}

/**
 * Lo que la evaluacion Elite aporta a la semana. Las rutinas con dia y los
 * suplementos ya viven en sus tablas (la carga los escribe ahi); de aqui
 * salen solo lo que no tiene tabla propia: la ventana de alimentacion, que
 * priorizar y que evitar, y las sesiones sin dia fijo.
 */
export function planDeEvaluacion(e: EliteV3): EvaluacionPlanIn {
  const d = detallePuertas(e);
  const a = e.alimentacion;
  const priorizaEvita = a.prioriza.length + a.evita.length > 0;
  const ventana = a.ventana ?? null;
  // 8-oct-2026 (nivel 2): "tu evaluación" en Elite (igual que antes); "tu
  // programa" en un programa sin evaluacion que leer.
  const voz = vozDeDocumento(e);
  let alimentacion: EvaluacionPlanIn['alimentacion'] = null;
  if (priorizaEvita) alimentacion = { titulo: 'Qué priorizar y qué evitar', detalle: d.alimentacion };
  else if (!ventana && seccionTieneContenido(e, 'alimentacion')) {
    alimentacion = { titulo: `Tu alimentación en ${voz.documento}`, detalle: null };
  }
  return {
    voz,
    entrenamiento: seccionTieneContenido(e, 'entrenamiento') ? d.entrenamiento : null,
    ventana,
    alimentacion,
    rutinas: (e.entrenamiento.rutinas ?? [])
      .map((r) => (typeof r?.nombre === 'string' ? r.nombre.trim() : ''))
      .filter((n) => n !== ''),
  };
}

// ---------------------------------------------------------------------------
// 6. El dia
// ---------------------------------------------------------------------------

export interface FilaPlan {
  id: string;
  /** Que. */
  titulo: string;
  /** Cuando: una hora, un momento ("Con comida") o null si no hay ninguno fijado. */
  cuando: string | null;
  detalle: string | null;
  /**
   * De quien es. null = es de la persona pero HOY no existe una puerta para
   * moverla: no se promete "Lo puedes mover" sin editor detras.
   */
  dueno: DuenoPlan | null;
  etiqueta: string | null;
  destino: DestinoPlan | null;
  /** El gesto, en corto: "Cambiar hora", "Ver y pausar". */
  accion: string | null;
}

export interface CtaPlan {
  texto: string;
  destino: DestinoPlan;
}

export type SeccionPlan =
  | { key: SeccionKey; titulo: string; estado: 'error' }
  | {
    key: SeccionKey;
    titulo: string;
    estado: 'ok';
    filas: FilaPlan[];
    /** Lo que falta, dicho llano ("Descanso...", "Todavía no..."). */
    nota: string | null;
    cta: CtaPlan | null;
    /** Una de sus lecturas fallo y la otra no: se pinta lo leido y se dice. */
    parcial: string | null;
  };

export interface ConteoDia {
  /** undefined = no se pidio; null = no se pudo leer. */
  entrenamiento?: { titulo: string | null; hayPlan: boolean } | null;
  /** Las tomas que tocan ESE dia. */
  suplementos?: number | null;
  /**
   * 8-oct-2026 (revisión en frío). Fichas 'semanal' (una vez por semana, sin
   * dia fijo) y fichas del plan en total, toquen o no ese dia. Con una sola
   * ficha en el plan la cuenta TIENE plan: sin estos dos numeros, quien solo
   * tenia un suplemento semanal leia "Todavía no tienes un plan armado".
   */
  suplementosSemanales?: number;
  suplementosEnPlan?: number;
  practicas?: number | null;
  habitos?: number | null;
  /** Hay un plan de alimentacion activo. */
  planAlimentacion?: boolean | null;
}

export interface DiaPlan {
  fecha: string;
  esHoy: boolean;
  /** En el orden de la pantalla. Una seccion sin nada que decir no viene. */
  secciones: SeccionPlan[];
  conteo: ConteoDia;
  /** Un nombre por cada fila "Lo fijó ..." del dia (null = no se pudo saber quien). */
  coaches: Array<string | null>;
  /**
   * La evaluacion Elite no se pudo leer y hay que decirlo; null = nada que
   * avisar. 'lectura' solo se avisa a quien puede tenerla; 'formato' prueba
   * por si mismo que la tiene (la fila existe y esta version no la entiende).
   */
  avisoEvaluacion: MotivoFallo | null;
  /**
   * 8-oct-2026 (nivel 2): las palabras del documento de esta cuenta
   * (vozDelPlan). null = no se sabe de que tipo es: se habla neutro.
   */
  voz: VozPrograma | null;
}

export interface ContextoPlan {
  /** Quien firma el plan Elite (NOMBRE_COACH_ELITE). Entra por parametro: el core no lo fija. */
  coachElite: string;
  /**
   * La cuenta tiene o puede tener evaluacion Elite (falloEvaluacionEsFatal).
   * Solo entonces un fallo de esa lectura se avisa: a una cuenta general no se
   * le habla de una evaluacion que no tiene.
   */
  evaluacionEsperada?: boolean;
  /**
   * 8-oct-2026 (nivel 2): lo que la pantalla sabe del tipo de documento sin
   * haberlo leido completo (useProgramaElite lee solo el inicio). Sirve
   * cuando la parte 'evaluacion' fallo o no se pidio. null o ausente = no se
   * sabe.
   */
  voz?: VozPrograma | null;
}

/**
 * Las palabras con las que Mi plan nombra el documento (8-oct-2026, nivel 2).
 * El documento leido manda; si no se leyo, lo que la pantalla sepa del tipo;
 * si nada, null y quien pinta habla neutro ("tu programa"), nunca "Elite".
 */
export function vozDelPlan(ins: InsumosPlan, ctx: Pick<ContextoPlan, 'voz'>): VozPrograma | null {
  const ev = ins.evaluacion;
  if (ev && ev.ok && ev.dato) return ev.dato.voz ?? VOZ_ELITE;
  return ctx.voz ?? null;
}

/**
 * Como se nombra el documento a media frase. Sin voz: "tu programa", que es
 * verdad para los dos niveles (el cliente Elite tambien tiene MI PROGRAMA).
 */
export function documentoDe(voz: Pick<VozPrograma, 'documento'> | null | undefined): string {
  return voz ? voz.documento : 'tu programa';
}

function fila(f: Omit<FilaPlan, 'etiqueta'> & { coach?: string | null }): FilaPlan {
  const { coach, ...resto } = f;
  const etiqueta = f.dueno === 'tuyo' ? ETIQUETA_TUYO
    : f.dueno === 'argos' ? ETIQUETA_ARGOS
      : f.dueno === 'coach' ? etiquetaCoach(coach)
        : null;
  return { ...resto, etiqueta };
}

interface Armado {
  filas: FilaPlan[];
  nota: string | null;
  cta: CtaPlan | null;
  /** Nombres de coach de las filas 'coach' (null = desconocido). */
  coaches: Array<string | null>;
}

const ARMADO_VACIO: Armado = { filas: [], nota: null, cta: null, coaches: [] };

interface Ordenable {
  f: FilaPlan;
  orden: number | null;
  nombre: string;
}

/** Por hora; lo que no tiene hora al final; empates por nombre (dos renders, misma lista). */
function porHora(a: Ordenable, b: Ordenable): number {
  if (a.orden === null && b.orden === null) return a.nombre.localeCompare(b.nombre, 'es');
  if (a.orden === null) return 1;
  if (b.orden === null) return -1;
  return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es');
}

// --- Entrenamiento ----------------------------------------------------------

function cadaCuando(row: AsignacionRow, fecha: string): string {
  if (row.schedule_type === 'specific_date') return 'Solo este día';
  return `Cada ${DIA_LABELS[parseLocalDate(fecha).getDay()].toLowerCase()}`;
}

function hayAsignaciones(rows: ReadonlyArray<AsignacionRow>): boolean {
  return rows.some((r) => r?.is_active && (r.focus != null || r.routine_id != null));
}

/** La persona tiene enfoques propios en su semana: lo unico que /plan-entrenamiento mueve. */
function hayEnfoquesPropios(rows: ReadonlyArray<AsignacionRow>): boolean {
  return rows.some((r) => r?.is_active && r.focus != null);
}

function armarEntrenamiento(
  rows: AsignacionRow[],
  fecha: string,
  coachPorId: Readonly<Record<string, string>>,
): Armado & { titulo: string | null; hayPlan: boolean; rutinaDeCoach: string | null } {
  const { elegida, desplazada } = resolverHoy(rows, fecha);
  const hayPlan = hayAsignaciones(rows);
  if (!elegida) {
    // 8-oct-2026 (revisión en frío): "Mover mis días de entrenar" solo se
    // ofrece a quien tiene dias propios que mover. Con una semana hecha solo de
    // rutinas (las que asigno el coach, o una propia agendada), ese editor no
    // mueve ninguna: lo que si hace es agregar un enfoque propio, y eso se dice.
    const textoCta = !hayPlan ? 'Armar mi plan de entrenar'
      : hayEnfoquesPropios(rows) ? 'Mover mis días de entrenar'
        : 'Agregar un entrenamiento mío';
    return {
      ...ARMADO_VACIO,
      titulo: null,
      hayPlan,
      rutinaDeCoach: null,
      nota: hayPlan
        ? 'Descanso. No hay entrenamiento agendado este día.'
        : 'Todavía no has dicho qué días entrenas.',
      cta: { texto: textoCta, destino: aRuta(RUTAS_MI_PLAN.planEntrenamiento) },
    };
  }
  const titulo = tituloDeAsignacion(elegida);
  const filas: FilaPlan[] = [];
  const coaches: Array<string | null> = [];
  if (esRutinaDeCoach(elegida)) {
    const coach = (elegida.assigned_by && coachPorId[elegida.assigned_by]) || null;
    coaches.push(coach);
    filas.push(fila({
      id: `ent:${elegida.id ?? 'coach'}`,
      titulo,
      cuando: null,
      detalle: `Rutina asignada. ${cadaCuando(elegida, fecha)}.`,
      dueno: 'coach',
      coach,
      destino: aRuta(RUTAS_MI_PLAN.entrenar),
      accion: 'Abrir en Entrenar',
    }));
    if (desplazada) {
      // Lo propio que la rutina asignada desplazo ese dia se dice, no se
      // esconde (misma idea que el hub de Entrenar): sigue siendo suyo.
      const esRutina = desplazada.routine_id != null;
      filas.push(fila({
        id: `ent:${desplazada.id ?? 'propio'}:desplazada`,
        titulo: tituloDeAsignacion(desplazada),
        cuando: null,
        detalle: 'Lo tuyo de este día. La rutina asignada va primero.',
        // Un enfoque propio se mueve en su editor; una rutina propia
        // agendada no tiene editor de dias hoy (ver abajo).
        dueno: esRutina ? null : 'tuyo',
        destino: aRuta(esRutina ? RUTAS_MI_PLAN.misRutinas : RUTAS_MI_PLAN.planEntrenamiento),
        accion: esRutina ? 'Ver en Mis rutinas' : 'Mover mis días',
      }));
    }
  } else if (elegida.routine_id != null) {
    // Una rutina guardada que la persona se agendo (el agendado viejo). Es
    // suya, pero HOY la app no tiene donde cambiarle los dias: el modal que
    // lo hacia (ScheduleModal) no esta montado en ninguna pantalla, y el
    // editor de enfoques no la toca ("se maneja desde Mis rutinas"). Sin
    // puerta no se promete "Lo puedes mover": se dice tal cual y se lleva a
    // donde vive la rutina.
    filas.push(fila({
      id: `ent:${elegida.id ?? 'rutina'}`,
      titulo,
      cuando: null,
      detalle: `Tu rutina agendada. ${cadaCuando(elegida, fecha)}. Sus días todavía no se cambian desde la app.`,
      dueno: null,
      destino: aRuta(RUTAS_MI_PLAN.misRutinas),
      accion: 'Ver en Mis rutinas',
    }));
  } else {
    filas.push(fila({
      id: `ent:${elegida.id ?? 'enfoque'}`,
      titulo,
      cuando: null,
      detalle: `Enfoque de tu plan. ${cadaCuando(elegida, fecha)}.`,
      dueno: 'tuyo',
      destino: aRuta(RUTAS_MI_PLAN.planEntrenamiento),
      accion: 'Mover mis días',
    }));
  }
  const rutinaDeCoach = esRutinaDeCoach(elegida) ? (elegida.routine_name ?? '').trim() || null : null;
  return { filas, nota: null, cta: null, coaches, titulo, hayPlan, rutinaDeCoach };
}

// --- Suplementos ------------------------------------------------------------

const MOMENTO_TOMA_LABEL: Readonly<Record<string, string>> = {
  morning: 'Mañana',
  with_food: 'Con comida',
  afternoon: 'Tarde',
  evening: 'Noche',
  bedtime: 'Antes de dormir',
};

/**
 * Cuando se toma una ficha, en texto, y con que minuto se ORDENA. `dose_times`
 * manda (horas exactas o etiquetas); sin array, su momento. Una ficha sin
 * momento conocido queda sin "cuando": no se le pone 08:00.
 */
export function momentosDeToma(row: Pick<SuplementoPlanRow, 'timing' | 'dose_times'>): {
  texto: string | null;
  orden: number | null;
} {
  const textos: string[] = [];
  let orden: number | null = null;
  const anotar = (min: number | null) => {
    if (min !== null && (orden === null || min < orden)) orden = min;
  };
  const tomas = Array.isArray(row.dose_times)
    ? row.dose_times.filter((l): l is string => typeof l === 'string' && l.trim() !== '')
    : [];
  if (tomas.length >= 1) {
    for (const t of tomas) {
      const etiqueta = t.trim();
      const fija = HORA_POR_TOMA[etiqueta];
      if (fija) {
        textos.push(mayusculaInicial(etiqueta));
        anotar(parseHHMM(fija));
        continue;
      }
      const hora = horaLimpia(etiqueta);
      if (hora) {
        textos.push(hora);
        anotar(parseHHMM(hora));
      }
    }
  } else if (row.timing && MOMENTO_TOMA_LABEL[row.timing]) {
    textos.push(MOMENTO_TOMA_LABEL[row.timing]);
    anotar(parseHHMM(HORA_POR_TOMA[TOMA_POR_TIMING[row.timing]]));
  }
  return { texto: textos.length > 0 ? unirConY(textos) : null, orden };
}

function armarSuplementos(
  rows: SuplementoPlanRow[],
  fecha: string,
  coachElite: string,
): Armado & { cuenta: number; semanales: number; enPlan: number } {
  // Solo el plan activo: una ficha eventual no tiene dia ni hora que prometer.
  const delPlan = rows.filter((r) => r && r.is_active !== false && esPlan(r) && (r.name ?? '').trim() !== '');
  if (delPlan.length === 0) return { ...ARMADO_VACIO, cuenta: 0, semanales: 0, enPlan: 0 };
  const coaches: Array<string | null> = [];
  let cuenta = 0;
  let semanales = 0;
  const ordenables: Ordenable[] = [];
  for (const r of delPlan) {
    const semanal = r.dose_pattern === 'semanal';
    // 'semanal' no tiene dia fijo: se muestra toda la semana y no se cuenta
    // como toma de hoy (no se sabe si toca hoy).
    if (!semanal && !esDiaProgramado(r.dose_pattern, fecha)) continue;
    const nombre = (r.name ?? '').trim();
    const { texto, orden } = momentosDeToma(r);
    const delCoach = esDelCoach(r);
    if (semanal) semanales += 1;
    else cuenta += 1;
    if (delCoach) coaches.push(coachElite);
    const detalles: string[] = [];
    if (semanal) detalles.push('Una vez por semana, sin día fijo');
    if (!texto) detalles.push('Sin momento del día fijado');
    ordenables.push({
      nombre,
      orden,
      f: fila({
        id: `sup:${r.id}`,
        titulo: nombre,
        cuando: texto,
        detalle: detalles.length > 0 ? detalles.join(' · ') : null,
        dueno: delCoach ? 'coach' : 'tuyo',
        coach: delCoach ? coachElite : undefined,
        destino: aRuta(RUTAS_MI_PLAN.suplementos),
        // La pausa de una ficha del plan ya existe en Mis suplementos
        // (toque largo): aqui solo se lleva a ella.
        accion: delCoach ? 'Ver y pausar en Mis suplementos' : 'Cambiar momento u hora',
      }),
    });
  }
  ordenables.sort(porHora);
  const filas = ordenables.map((o) => o.f);
  return {
    filas,
    nota: filas.length === 0 ? 'Este día no toca ninguno de tus suplementos.' : null,
    cta: null,
    coaches,
    cuenta,
    semanales,
    enPlan: delPlan.length,
  };
}

// --- Practicas y habitos ----------------------------------------------------

function armarPracticasYHabitos(
  practicas: PracticaPlanRow[] | null,
  habitos: HabitoPlanRow[] | null,
  coachElite: string,
): Armado {
  const ordenables: Ordenable[] = [];
  const coaches: Array<string | null> = [];
  for (const p of practicas ?? []) {
    const extra = p.hora && !p.horaTuya ? 'hora sugerida por tu horario' : !p.hora ? 'sin hora' : null;
    if (p.deCoach) {
      // 8-oct-2026 (nivel 2): la asigno el coach desde el programa. Mismo
      // trato que un suplemento del plan: se consulta y se pausa en su ficha,
      // y su hora la ajusta el coach (la ficha esconde el editor de hora).
      // "Sugerida por tu horario" no va: contradiria que la ajusta el coach.
      coaches.push(coachElite);
      const partes = [p.hora ? null : 'sin hora', `su hora la ajusta ${coachElite.trim() || 'tu coach'}`].filter(Boolean);
      ordenables.push({
        nombre: p.nombre,
        orden: parseHHMM(p.hora),
        f: fila({
          id: `pra:${p.key}`,
          titulo: p.nombre,
          cuando: p.hora,
          detalle: `Práctica · ${partes.join(' · ')}`,
          dueno: 'coach',
          coach: coachElite,
          destino: { tipo: 'practica', key: p.key },
          accion: 'Ver y pausar',
        }),
      });
      continue;
    }
    ordenables.push({
      nombre: p.nombre,
      orden: parseHHMM(p.hora),
      f: fila({
        id: `pra:${p.key}`,
        titulo: p.nombre,
        cuando: p.hora,
        detalle: extra ? `Práctica · ${extra}` : 'Práctica',
        dueno: 'tuyo',
        destino: { tipo: 'practica', key: p.key },
        accion: 'Cambiar hora o pausar',
      }),
    });
  }
  for (const h of habitos ?? []) {
    const extra = h.segunSol ? 'su hora la marca el sol de cada día' : !h.hora ? 'sin hora' : null;
    // 8-oct-2026 (segunda revisión en frío): "Lo puedes mover" solo si su
    // ficha tiene editor de hora. Sin editor la fila no lleva etiqueta y dice
    // la verdad, igual que la rutina agendada y el sueño.
    const partes = [extra, h.editaHora ? null : 'su hora todavía no se cambia desde la app'].filter(Boolean);
    ordenables.push({
      nombre: h.nombre,
      orden: parseHHMM(h.hora),
      f: fila({
        id: `hab:${h.key}`,
        titulo: h.nombre,
        cuando: h.hora,
        detalle: partes.length > 0 ? `Hábito · ${partes.join(' · ')}` : 'Hábito',
        dueno: h.editaHora ? 'tuyo' : null,
        // Con app, su ficha del Centro (hora y meta). Sin app no hay hora que
        // editar: lo que se decide es si esta en tu dia, y eso vive en Ordenar.
        destino: h.appKey ? { tipo: 'habito', appKey: h.appKey } : aRuta(RUTAS_MI_PLAN.ordenarDia),
        accion: h.appKey ? 'Abrir su ficha' : 'Ordenar mi día',
      }),
    });
  }
  ordenables.sort(porHora);
  const filas = ordenables.map((o) => o.f);
  if (practicas !== null && habitos !== null && filas.length === 0) {
    return {
      ...ARMADO_VACIO,
      nota: 'No tienes prácticas ni hábitos encendidos.',
      cta: { texto: 'Armar mi día', destino: aRuta(RUTAS_MI_PLAN.armar) },
    };
  }
  // La propuesta de ARGOS trabaja sobre los habitos encendidos: sin habitos
  // leidos no hay sobre que proponer y la fila no se ofrece.
  if ((habitos ?? []).length > 0) {
    filas.push(fila({
      id: 'argos:ordenar',
      titulo: 'Qué dejar, qué graduar y qué descansar',
      cuando: null,
      detalle: 'ARGOS lee lo que sí has hecho y te lo propone. Nada cambia hasta que aceptas.',
      dueno: 'argos',
      destino: aRuta(RUTAS_MI_PLAN.ordenarDia),
      accion: 'Ver la propuesta',
    }));
  }
  return { filas, nota: null, cta: null, coaches };
}

// --- Alimentacion -----------------------------------------------------------

function armarAlimentacion(
  plan: PlanAlimentacionIn | null,
  metas: MetasPropiasIn | null,
  evaluacion: EvaluacionPlanIn | null,
  coachElite: string,
  voz: VozPrograma | null,
): Armado {
  const filas: FilaPlan[] = [];
  const coaches: Array<string | null> = [];
  // 8-oct-2026 (nivel 2): "Leer en tu evaluación" o "Leer en tu programa".
  const leerEn = `Leer en ${documentoDe(evaluacion?.voz ?? VOZ_ELITE)}`;
  if (plan) {
    const deCoach = !plan.propio;
    // 8-oct-2026 (revisión en frío): un plan PROPIO llevaba "Lo puedes mover"
    // y la fila abre Nutricion, que solo lo muestra: para el cliente no hay
    // editor de su plan. Sin puerta no se promete; se dice de quien es y que
    // todavia no se edita (misma regla que la rutina propia agendada).
    const dueno: DuenoPlan | null = deCoach ? 'coach' : null;
    const coach = deCoach ? plan.coachNombre : undefined;
    const accion = 'Ver en Nutrición';
    const metas = plan.metas.length > 0 ? plan.metas.join(' · ') : null;
    if (deCoach) coaches.push(plan.coachNombre);
    // 8-oct-2026 (nivel 2): la carga guarda "Plan Elite vN" tambien para un
    // cliente de programa. Sin voz conocida se muestra neutro ("Plan de
    // alimentación · vN"): es verdad para los dos y no le dice Elite a nadie.
    const nombrePlan = nombreVisibleDelPlan((plan.nombre ?? '').trim(), voz ?? { tipo: 'programa' });
    filas.push(fila({
      id: 'ali:plan',
      titulo: nombrePlan || 'Plan de alimentación',
      cuando: null,
      detalle: deCoach
        ? metas
        : `Tu plan. ${metas ? `${metas}. ` : ''}Todavía no se edita desde la app.`,
      dueno,
      coach,
      destino: aRuta(RUTAS_MI_PLAN.nutricion),
      accion,
    }));
    plan.comidas.forEach((c, i) => {
      const momento = MOMENTO_COMIDA_LABEL[c.momento];
      const partes = [c.hora ? momento : null, c.componentes.length > 0 ? c.componentes.join(', ') : null]
        .filter((x): x is string => !!x);
      filas.push(fila({
        id: `ali:comida:${i}`,
        titulo: c.nombre,
        // Con hora fija, la hora; sin hora, el momento ("Desayuno"). Nunca
        // una hora de relleno.
        cuando: c.hora ?? momento,
        detalle: partes.length > 0 ? partes.join(' · ') : null,
        dueno,
        coach,
        destino: aRuta(RUTAS_MI_PLAN.nutricion),
        accion,
      }));
    });
  }
  if (evaluacion?.ventana) {
    coaches.push(coachElite);
    filas.push(fila({
      id: 'ali:ventana',
      titulo: 'Ventana de alimentación',
      cuando: `${evaluacion.ventana.inicio} a ${evaluacion.ventana.fin}`,
      detalle: null,
      dueno: 'coach',
      coach: coachElite,
      destino: { tipo: 'evaluacion', seccion: 'alimentacion' },
      accion: leerEn,
    }));
  }
  if (evaluacion?.alimentacion) {
    coaches.push(coachElite);
    filas.push(fila({
      id: 'ali:evaluacion',
      titulo: evaluacion.alimentacion.titulo,
      cuando: null,
      detalle: evaluacion.alimentacion.detalle,
      dueno: 'coach',
      coach: coachElite,
      destino: { tipo: 'evaluacion', seccion: 'alimentacion' },
      accion: leerEn,
    }));
  }
  // La meta propia no se repite debajo de un plan asignado que ya fija ese numero.
  const planFija = (cual: 'fijaProteina' | 'fijaAgua') => !!plan && !plan.propio && plan[cual];
  if (metas?.proteina_g != null && !planFija('fijaProteina')) {
    filas.push(fila({
      id: 'ali:meta:proteina',
      titulo: 'Meta de proteína',
      cuando: null,
      detalle: `${Math.round(metas.proteina_g)} g al día`,
      dueno: 'tuyo',
      destino: { tipo: 'habito', appKey: 'comida' },
      accion: 'Cambiar mi meta',
    }));
  }
  if (metas?.agua_ml != null && !planFija('fijaAgua')) {
    filas.push(fila({
      id: 'ali:meta:agua',
      titulo: 'Meta de agua',
      cuando: null,
      detalle: `${Math.round(metas.agua_ml)} ml al día`,
      dueno: 'tuyo',
      destino: { tipo: 'habito', appKey: 'hidratacion' },
      accion: 'Cambiar mi meta',
    }));
  }
  return { filas, nota: null, cta: null, coaches };
}

// --- Sueno ------------------------------------------------------------------

function filaSueno(id: string, titulo: string, h: { hora: string; origen: OrigenHora }): FilaPlan {
  if (h.origen === 'cronotipo') {
    return fila({
      id,
      titulo,
      cuando: h.hora,
      // 8-oct-2026 (revisión en frío): llevaba "Lo puedes mover", y a donde
      // lleva no se mueve ninguna hora: solo se puede repetir el test. Sin
      // editor no se promete; se dice de donde sale y como cambia.
      detalle: 'Sale de tu test de cronotipo. No se edita a mano: cambia si repites el test.',
      dueno: null,
      destino: aRuta(RUTAS_MI_PLAN.cronotipo),
      accion: 'Ver mi cronotipo',
    });
  }
  // La hora que la persona dio al armar su dia solo se escribe en la primera
  // sesion: hoy no hay editor. Sin puerta no se promete "Lo puedes mover".
  return fila({
    id,
    titulo,
    cuando: h.hora,
    detalle: 'La hora que diste al armar tu día. Todavía no se edita desde la app.',
    dueno: null,
    destino: aRuta(RUTAS_MI_PLAN.sueno),
    accion: 'Abrir Sueño',
  });
}

function armarSueno(v: VentanaSuenoIn | null): Armado {
  if (!v || (!v.dormir && !v.despertar)) {
    return {
      ...ARMADO_VACIO,
      nota: 'Todavía no hay una ventana de sueño. Sale de tu test de cronotipo.',
      cta: { texto: 'Ver mi cronotipo', destino: aRuta(RUTAS_MI_PLAN.cronotipo) },
    };
  }
  const filas: FilaPlan[] = [];
  if (v.dormir) filas.push(filaSueno('sue:dormir', 'Dormir', v.dormir));
  if (v.despertar) filas.push(filaSueno('sue:despertar', 'Despertar', v.despertar));
  return { filas, nota: null, cta: null, coaches: [] };
}

// --- El ensamble ------------------------------------------------------------

function seccionOk(key: SeccionKey, a: Armado, parcial: string | null): SeccionPlan | null {
  // Sin filas, sin nota y sin aviso no hay nada que decir: la seccion se omite.
  if (a.filas.length === 0 && !a.nota && !parcial) return null;
  return { key, titulo: TITULO_SECCION[key], estado: 'ok', filas: a.filas, nota: a.nota, cta: a.cta, parcial };
}

function seccionError(key: SeccionKey): SeccionPlan {
  return { key, titulo: TITULO_SECCION[key], estado: 'error' };
}

/**
 * El dia `fecha` con lo que la cuenta tiene. `hoy` solo decide `esHoy`.
 * Cada seccion sale de SUS lecturas: una que fallo cae en "No se pudo leer"
 * y las demas siguen. Una parte no pedida (undefined) no pinta su seccion.
 */
export function componerDia(ins: InsumosPlan, fecha: string, hoy: string, ctx: ContextoPlan): DiaPlan {
  const secciones: SeccionPlan[] = [];
  const conteo: ConteoDia = {};
  const coaches: Array<string | null> = [];
  const evaluacion = ins.evaluacion && ins.evaluacion.ok ? ins.evaluacion.dato : null;
  const voz = vozDelPlan(ins, ctx);
  const agregar = (s: SeccionPlan | null) => { if (s) secciones.push(s); };

  // Entrenamiento
  if (ins.rutinas) {
    if (!ins.rutinas.ok) {
      conteo.entrenamiento = null;
      agregar(seccionError('entrenamiento'));
    } else {
      const a = armarEntrenamiento(ins.rutinas.dato, fecha, ins.coachPorId ?? {});
      conteo.entrenamiento = { titulo: a.titulo, hayPlan: a.hayPlan };
      const filas = [...a.filas];
      coaches.push(...a.coaches);
      // 8-oct-2026 (revisión en frío): el dia que ya toca una rutina que la
      // carga creo DESDE esa evaluacion (mismo nombre que en el documento), la
      // fila "Lo que marca tu evaluación" repetia lo que la rutina ya dice.
      const rutinaDelDia = a.rutinaDeCoach;
      const yaEstaEnLaRutina = rutinaDelDia !== null
        && (evaluacion?.rutinas ?? []).some((n) => mismoNombre(n, rutinaDelDia));
      if (evaluacion?.entrenamiento && !yaEstaEnLaRutina) {
        coaches.push(ctx.coachElite);
        // 8-oct-2026 (nivel 2): la voz del documento leido ("tu evaluación" o "tu programa").
        const doc = documentoDe(evaluacion.voz ?? VOZ_ELITE);
        filas.push(fila({
          id: 'ent:evaluacion',
          titulo: `Lo que marca ${doc}`,
          cuando: null,
          detalle: evaluacion.entrenamiento,
          dueno: 'coach',
          coach: ctx.coachElite,
          destino: { tipo: 'evaluacion', seccion: 'entrenamiento' },
          accion: `Leer en ${doc}`,
        }));
      }
      agregar(seccionOk('entrenamiento', { ...a, filas }, null));
    }
  }

  // Alimentacion: plan + metas propias (+ lo que marque la evaluacion).
  if (ins.planAlimentacion || ins.metas) {
    const planFallo = ins.planAlimentacion ? !ins.planAlimentacion.ok : false;
    const metasFallo = ins.metas ? !ins.metas.ok : false;
    if (ins.planAlimentacion) {
      conteo.planAlimentacion = ins.planAlimentacion.ok ? ins.planAlimentacion.dato !== null : null;
    }
    const pedidas = (ins.planAlimentacion ? 1 : 0) + (ins.metas ? 1 : 0);
    const fallidas = (planFallo ? 1 : 0) + (metasFallo ? 1 : 0);
    if (fallidas === pedidas) {
      agregar(seccionError('alimentacion'));
    } else {
      const a = armarAlimentacion(
        ins.planAlimentacion && ins.planAlimentacion.ok ? ins.planAlimentacion.dato : null,
        ins.metas && ins.metas.ok ? ins.metas.dato : null,
        evaluacion,
        ctx.coachElite,
        voz,
      );
      coaches.push(...a.coaches);
      const parcial = planFallo ? 'No se pudo leer tu plan de alimentación.'
        : metasFallo ? 'No se pudieron leer tus metas.'
          : null;
      agregar(seccionOk('alimentacion', a, parcial));
    }
  }

  // Suplementos
  if (ins.suplementos) {
    if (!ins.suplementos.ok) {
      conteo.suplementos = null;
      agregar(seccionError('suplementos'));
    } else {
      const a = armarSuplementos(ins.suplementos.dato, fecha, ctx.coachElite);
      conteo.suplementos = a.cuenta;
      conteo.suplementosSemanales = a.semanales;
      conteo.suplementosEnPlan = a.enPlan;
      coaches.push(...a.coaches);
      agregar(seccionOk('suplementos', a, null));
    }
  }

  // Practicas y habitos
  if (ins.practicas || ins.habitos) {
    const pFallo = ins.practicas ? !ins.practicas.ok : false;
    const hFallo = ins.habitos ? !ins.habitos.ok : false;
    const practicas = ins.practicas && ins.practicas.ok ? ins.practicas.dato : null;
    const habitos = ins.habitos && ins.habitos.ok ? ins.habitos.dato : null;
    if (ins.practicas) conteo.practicas = practicas ? practicas.length : null;
    if (ins.habitos) conteo.habitos = habitos ? habitos.length : null;
    const pedidas = (ins.practicas ? 1 : 0) + (ins.habitos ? 1 : 0);
    const fallidas = (pFallo ? 1 : 0) + (hFallo ? 1 : 0);
    if (fallidas === pedidas) {
      agregar(seccionError('practicas'));
    } else {
      // Una parte no pedida cuenta como "sin filas": solo un FALLO impide
      // decir "no tienes nada encendido".
      const a = armarPracticasYHabitos(pFallo ? null : practicas ?? [], hFallo ? null : habitos ?? [], ctx.coachElite);
      coaches.push(...a.coaches);
      const parcial = pFallo ? 'No se pudieron leer tus prácticas.'
        : hFallo ? 'No se pudieron leer tus hábitos.'
          : null;
      agregar(seccionOk('practicas', a, parcial));
    }
  }

  // Sueno
  if (ins.sueno) {
    if (!ins.sueno.ok) agregar(seccionError('sueno'));
    else agregar(seccionOk('sueno', armarSueno(ins.sueno.dato), null));
  }

  return {
    fecha,
    esHoy: fecha === hoy,
    secciones,
    conteo,
    coaches,
    avisoEvaluacion: motivoAvisoEvaluacion(ins.evaluacion, ctx.evaluacionEsperada === true),
    voz,
  };
}

function motivoAvisoEvaluacion(ev: InsumosPlan['evaluacion'], esperada: boolean): MotivoFallo | null {
  if (!ev || ev.ok) return null;
  if (ev.motivo === 'formato') return 'formato';
  return esperada ? 'lectura' : null;
}

/**
 * Lo que se le dice a la persona cuando su evaluacion no se pudo leer
 * (8-oct-2026, revisión en frío). Con 'formato' NO se ofrece Reintentar:
 * volver a leer la misma fila con la misma app da lo mismo, y un boton que
 * nunca puede funcionar es peor que no tenerlo.
 *
 * 8-oct-2026 (nivel 2): el documento se nombra con la voz que se conozca
 * (DiaPlan.voz). Con la voz de Elite el texto es el de siempre; sin voz se
 * dice "tu programa", que es verdad para los dos niveles.
 */
export function avisoDeEvaluacion(
  motivo: MotivoFallo,
  voz?: Pick<VozPrograma, 'documento'> | null,
): { texto: string; reintentar: boolean } {
  const doc = documentoDe(voz);
  if (motivo === 'formato') {
    return {
      texto: `Esta versión de la app no puede leer ${doc}. Lo demás de tu plan sí está aquí.`,
      reintentar: false,
    };
  }
  return {
    texto: `No se pudo leer lo que marca ${doc}. Lo demás de tu plan sí está aquí.`,
    reintentar: true,
  };
}

/**
 * Los nombres de coach de TODA la semana de `hoy` (uno por fila "Lo fijó
 * ...", null = no se supo quien). 8-oct-2026 (revisión en frío): el bloque
 * "Como se ajusta tu plan" explica las etiquetas de la semana, no las del dia
 * que se mira; vacio = la cuenta no tiene nada fijado por un coach y su linea
 * no se pinta.
 */
export function coachesDeLaSemana(ins: InsumosPlan, hoy: string, ctx: ContextoPlan): Array<string | null> {
  return semanaDe(hoy).flatMap((fecha) => componerDia(ins, fecha, hoy, ctx).coaches);
}

/**
 * Lecturas en paralelo, cada una contra su tope (8-oct-2026, revisión en
 * frío). Cada tarea dice que partes trae; si no llega a tiempo, o llega sin
 * alguna de ellas, ESAS partes quedan como "no se pudo leer" y las demas
 * tareas no se enteran. Nunca rechaza.
 */
export interface TareaLectura {
  partes: readonly ParteKey[];
  lectura: Promise<InsumosPlan>;
}

export async function juntarLecturas(
  tareas: ReadonlyArray<TareaLectura>,
  ms: number = TOPE_PARTE_MS,
  reloj?: Reloj,
): Promise<InsumosPlan> {
  const caida = (partes: readonly ParteKey[]): InsumosPlan => {
    const o: InsumosPlan = {};
    for (const p of partes) (o as Record<ParteKey, unknown>)[p] = LECTURA_FALLIDA;
    return o;
  };
  const trozos = await Promise.all(tareas.map((t) => conTope(t.lectura, ms, caida(t.partes), reloj)));
  const out: InsumosPlan = {};
  trozos.forEach((trozo, i) => {
    Object.assign(out, trozo);
    // Una parte prometida que no vino (su lector lanzo a medias) es un fallo, no "no pedida".
    for (const p of tareas[i].partes) {
      if (out[p] === undefined) (out as Record<ParteKey, unknown>)[p] = LECTURA_FALLIDA;
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// 7. La linea de resumen y la tarjeta de HOY
// ---------------------------------------------------------------------------

export type ResumenPlan =
  /** `incompleta`: alguna parte no se pudo leer y por eso no esta en la linea. */
  | { tipo: 'linea'; texto: string; incompleta: boolean }
  /** TODO se leyo y no hay nada armado. */
  | { tipo: 'sin_plan' }
  /** No hay con que decir nada: ni linea ni "no tienes plan". */
  | { tipo: 'error' };

/**
 * "Hoy: Pierna y empuje · 4 suplementos · 3 prácticas · 6 hábitos". Solo las
 * partes que existen: un cero no se escribe y un fallo tampoco (queda
 * `incompleta`). "Sin plan" exige que todo lo pedido se haya leido: con una
 * sola lectura caida no se puede afirmar que no hay nada.
 */
export function resumenDelDia(dia: DiaPlan, prefijo = 'Hoy'): ResumenPlan {
  const c = dia.conteo;
  const partes: string[] = [];
  let pedidas = 0;
  let fallidas = 0;
  /** true solo cuando la parte se pidio Y se leyo. */
  const leida = (v: unknown): boolean => {
    if (v === undefined) return false;
    pedidas += 1;
    if (v === null) { fallidas += 1; return false; }
    return true;
  };
  if (leida(c.entrenamiento) && c.entrenamiento) {
    if (c.entrenamiento.titulo) partes.push(c.entrenamiento.titulo);
    else if (c.entrenamiento.hayPlan) partes.push('descanso de entrenar');
  }
  if (leida(c.planAlimentacion) && c.planAlimentacion === true) partes.push('plan de alimentación');
  if (leida(c.suplementos) && typeof c.suplementos === 'number') {
    // 8-oct-2026 (revisión en frío): un plan de suplementos que hoy no trae
    // toma (uno semanal, o uno de lun/mié/vie en martes) sigue siendo plan.
    // Se dice lo que hay, para que la linea nunca caiga en "sin plan".
    const semanales = c.suplementosSemanales ?? 0;
    if (c.suplementos > 0) partes.push(plural(c.suplementos, 'suplemento', 'suplementos'));
    else if (semanales > 0) partes.push(plural(semanales, 'suplemento semanal', 'suplementos semanales'));
    else if ((c.suplementosEnPlan ?? 0) > 0) partes.push('no tocan suplementos');
  }
  if (leida(c.practicas) && typeof c.practicas === 'number' && c.practicas > 0) {
    partes.push(plural(c.practicas, 'práctica', 'prácticas'));
  }
  if (leida(c.habitos) && typeof c.habitos === 'number' && c.habitos > 0) {
    partes.push(plural(c.habitos, 'hábito', 'hábitos'));
  }
  if (partes.length > 0) {
    const [primera, ...resto] = partes;
    return {
      tipo: 'linea',
      texto: `${prefijo}: ${[mayusculaInicial(primera), ...resto].join(' · ')}`,
      incompleta: fallidas > 0,
    };
  }
  if (pedidas === 0 || fallidas > 0) return { tipo: 'error' };
  return { tipo: 'sin_plan' };
}

export interface TarjetaMiPlan {
  /** La linea real de hoy, o el estado dicho llano. */
  linea: string;
  /** Segunda linea, solo cuando hay algo mas que decir. */
  mensaje: string | null;
  cta: CtaPlan | null;
  /** La tarjeta ofrece Reintentar (no hay linea que mostrar). */
  reintentar: boolean;
}

/**
 * Lo que pinta la tarjeta MI PLAN de HOY. Con algo armado lleva a /mi-plan;
 * sin nada armado no promete un plan: lo dice y lleva a donde se arma; sin
 * lectura dice que no pudo leer y ofrece reintentar (nunca una tarjeta feliz
 * y vacia).
 */
export function tarjetaMiPlan(r: ResumenPlan): TarjetaMiPlan {
  if (r.tipo === 'linea') {
    return {
      linea: r.texto,
      mensaje: r.incompleta ? 'Una parte no se pudo leer. Ábrelo para reintentar.' : null,
      cta: { texto: 'VER MI PLAN', destino: aRuta(RUTAS_MI_PLAN.miPlan) },
      reintentar: false,
    };
  }
  if (r.tipo === 'sin_plan') {
    return {
      linea: 'Todavía no tienes un plan armado',
      mensaje: 'Dos preguntas y la app arma tu día.',
      cta: { texto: 'ARMAR MI PLAN', destino: aRuta(RUTAS_MI_PLAN.armar) },
      reintentar: false,
    };
  }
  return {
    linea: 'No pudimos leer tu plan',
    mensaje: 'Revisa tu conexión y vuelve a intentar.',
    cta: null,
    reintentar: true,
  };
}

// ---------------------------------------------------------------------------
// 8. A quien se le escribe
// ---------------------------------------------------------------------------

/** Mismo nombre sin importar mayusculas, acentos ni espacios de mas. */
function mismoNombre(a: string, b: string): boolean {
  const n = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sinEspacios = (s: string) => n(s).replace(/\s+/g, ' ');
  return sinEspacios(a) === sinEspacios(b);
}

export type ContactoCoach =
  | { tipo: 'ninguno' }
  /** El boton "Escríbele a {coach}" de la app (EscribirleCoach), que le escribe a quien firma el plan Elite. */
  | { tipo: 'elite' }
  /** Lo fijo otra persona, o no se sabe quien: ese boton le escribiria a alguien mas. Solo se dice. */
  | { tipo: 'otro'; texto: string };

/**
 * Que contacto se ofrece bajo las filas "Lo fijó ...". El unico boton de
 * contacto que existe le escribe al coach Elite; solo se ofrece cuando lo que
 * se ve lo fijo esa persona. Si lo fijo otra, o no se sabe quien, no se abre
 * un chat con alguien que no es.
 */
export function contactoCoach(dia: Pick<DiaPlan, 'coaches'>, coachElite: string): ContactoCoach {
  if (dia.coaches.length === 0) return { tipo: 'ninguno' };
  const conocidos = dia.coaches.filter((c): c is string => typeof c === 'string' && c.trim() !== '');
  // 8-oct-2026 (revisión en frío): con UNA sola fila de coach sin resolver ya
  // no se ofrece el boton. Antes bastaba que las demas fueran del coach Elite,
  // y "Escríbele a Enrique" quedaba debajo de algo que quiza fijo otra persona.
  const hayDesconocido = conocidos.length < dia.coaches.length;
  const otros = conocidos.filter((c) => !mismoNombre(c, coachElite));
  if (!hayDesconocido && otros.length === 0) return { tipo: 'elite' };
  // El nombre solo se dice cuando se sabe de todas las filas y es uno solo.
  const unoSolo = !hayDesconocido && otros.length > 0 && otros.every((c) => mismoNombre(c, otros[0]));
  const quien = unoSolo ? otros[0].trim() : 'tu coach';
  return { tipo: 'otro', texto: `Lo que fijó ${quien} se ajusta platicándolo directamente. Desde aquí no se mueve.` };
}

/**
 * El nombre que lleva la linea del coach en "Como se ajusta tu plan": el de
 * esas filas si es uno solo y TODAS se resolvieron. Con una sin resolver, o
 * con dos nombres, null ("tu coach"): no se firma con un nombre lo que quiza
 * fijo otra persona.
 */
export function coachDelDia(dia: Pick<DiaPlan, 'coaches'>): string | null {
  const conocidos = dia.coaches.filter((c): c is string => typeof c === 'string' && c.trim() !== '');
  if (conocidos.length === 0 || conocidos.length < dia.coaches.length) return null;
  return conocidos.every((c) => mismoNombre(c, conocidos[0])) ? conocidos[0].trim() : null;
}

// ---------------------------------------------------------------------------
// 9. El dia que se mira (8-oct-2026, revisión en frío)
// ---------------------------------------------------------------------------

/**
 * El dia que la pantalla muestra. `elegida` null = "seguir a hoy": la
 * pantalla guardaba la fecha de hoy al abrirse y, pasada la medianoche,
 * seguia mostrando ayer con el titulo de "hoy" apagado. Un dia elegido que ya
 * no cae en la semana de `hoy` (se cruzo el domingo) tambien vuelve a hoy.
 */
export function diaVisible(elegida: string | null, hoy: string): string {
  return elegida !== null && semanaDe(hoy).includes(elegida) ? elegida : hoy;
}

/** Lo que se guarda al tocar un dia de la tira: tocar HOY es volver a seguirlo. */
export function alElegirDia(fecha: string, hoy: string): string | null {
  return fecha === hoy ? null : fecha;
}

/** Sin sesion (enlace profundo sin cuenta): se dice, no se deja un hueco en blanco. */
export const SIN_SESION = {
  titulo: 'Inicia sesión para ver tu plan',
  cuerpo: 'Tu plan sale de lo que tienes guardado en tu cuenta.',
} as const;
