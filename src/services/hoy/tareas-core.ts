/**
 * TAREAS — núcleo puro (MB-20 Pieza 1).
 *
 * HOY es tu checklist del día. Una sola fuente (CompiledDay), dos lentes:
 *   · TAREAS: agrupado por momento del día (mañana / tarde / noche), sin horas.
 *   · AGENDA: la misma lista ordenada cronológicamente con su hora.
 *
 * Este módulo decide QUÉ es cada fila (gesto, momento, hora canónica) a partir
 * de los electrones compilados. Cero imports con runtime nativo: testeable en
 * el harness node. Los tipos de day-compiler entran como `import type` (se
 * borran al compilar).
 */
import {
  VERIFIED_ELECTRON_KEYS,
  VERIFIED_ELECTRON_ROUTES,
} from '@/src/services/hoy/day-booleans';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { ELECTRON_TO_APP } from '@/src/constants/electron-app-bridge';
import type { ElectronSource } from '@/src/constants/electrons';

// ── Shapes estructurales (espejo type-only de day-compiler) ──

/** Ruta navegable sin acoplar el núcleo a expo-router (Href entra tal cual). */
export type TareaRoute = string | { pathname: string; params?: Record<string, unknown> };

export interface TareaBoolLike {
  source: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
  completed: boolean;
}

export interface TareaQuantLike {
  source: string;
  name: string;
  icon: string;
  color: string;
  current: number;
  target: number;
  displayCurrent: string;
  displayTarget: string;
}

export interface TareaAgendaLike {
  id: string;
  time: string;
  name: string;
  subtitle?: string;
  completed: boolean;
  isSmart: boolean;
  route?: string;
  informational?: boolean;
}

// ── Momentos ──

export type Momento = 'manana' | 'tarde' | 'noche';
export const MOMENTOS: readonly Momento[] = ['manana', 'tarde', 'noche'];
export const MOMENTO_LABELS: Record<Momento, string> = {
  manana: 'MAÑANA',
  tarde: 'TARDE',
  noche: 'NOCHE',
};

/** Umbrales espejo de los divisores de /agenda: <12 mañana, <18 tarde. */
export function momentoForHour(hour: number): Momento {
  if (hour < 12) return 'manana';
  if (hour < 18) return 'tarde';
  return 'noche';
}

/** Minutos desde medianoche de una hora "HH:MM". El orden es numérico y no
 * puede romperse con horas sin cero a la izquierda ("9:30") ni clasificar mal
 * la medianoche ("00:30" es hora 0, no un falsy que caiga a mediodía).
 * Hora ilegible → mediodía, el mismo default neutro de siempre. */
export function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(':');
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (!Number.isFinite(hh)) return 12 * 60;
  return hh * 60 + (Number.isFinite(mm) ? mm : 0);
}

/** Momento canónico por hábito. El boceto de MB-20 manda: Entrenar vive en
 * la mañana; el cierre (journal, pantallas, lentes) en la noche. */
export const TAREA_MOMENTO: Record<string, Momento> = {
  sunlight: 'manana',
  meditation: 'manana',
  supplements: 'manana',
  cold_shower: 'manana',
  checkin: 'manana',
  period_log: 'manana',
  strength: 'manana',
  water: 'manana',
  protein: 'tarde',
  cardio: 'tarde',
  grounding: 'tarde',
  no_processed_foods: 'tarde',
  nback: 'tarde',
  breathwork: 'tarde',
  steps: 'tarde',
  journal: 'noche',
  red_glasses: 'noche',
  no_alcohol: 'noche',
  screen_time_cutoff: 'noche',
  sleep: 'noche',
};

/** Hora canónica para la lente AGENDA (los eventos reales de /agenda tienen
 * la suya; esto ordena los hábitos sin evento). */
export const TAREA_TIME: Record<string, string> = {
  meditation: '07:00',
  sunlight: '07:30',
  cold_shower: '07:45',
  supplements: '08:00',
  water: '08:30',
  checkin: '09:00',
  period_log: '09:30',
  strength: '10:00',
  no_processed_foods: '14:00',
  protein: '14:30',
  grounding: '16:00',
  cardio: '17:00',
  nback: '18:00',
  breathwork: '18:30',
  red_glasses: '20:00',
  no_alcohol: '21:00',
  journal: '21:30',
  screen_time_cutoff: '21:45',
  sleep: '22:30',
  steps: '17:30',
};

// ── Gestos ──

/** Qué hace el TAP SIMPLE en cada fila (MB-20.4 lo invirtió: palomear es la
 * acción principal y merece el gesto barato). El tap largo SIEMPRE navega a
 * la función — y sin ruta, no hace nada. 'navegar' = solo se abre (con tap
 * largo); su tap simple no hace nada. */
export type TareaGesto = 'palomear' | 'experiencia' | 'inline' | 'navegar';

/** Experiencias: palomear no regala el check — pregunta primero. */
export const EXPERIENCIA_SOURCES: readonly string[] = [
  'meditation', 'breathwork', 'strength', 'journal', 'nback', 'cardio',
];

/** Experiencias con captura externa limpia (existe writer real de sesión):
 * mind_sessions para meditar/respirar, cardio_sessions manual para cardio. */
export const EXPERIENCIA_CAPTURA: readonly string[] = [
  'meditation', 'breathwork', 'cardio',
];

/** Experiencias SIN captura externa: su registro real ES una pantalla, y el SÍ
 * del modal navega ahí (la partida de N-Back, la entrada de journal, el logger
 * de fuerza que escribe exercise_logs). Toda EXPERIENCIA_SOURCES debe estar en
 * EXPERIENCIA_CAPTURA o aquí: el modal nunca tiene un solo botón (hay test). */
export const EXPERIENCIA_REGISTRO: Record<string, string> = {
  strength: '/log-exercise',
  journal: '/journal',
  nback: '/mente/nback/sesion',
};

export function gestoForBool(source: string): TareaGesto {
  if ((VERIFIED_ELECTRON_KEYS as readonly string[]).includes(source)) {
    return (EXPERIENCIA_SOURCES as readonly string[]).includes(source) ? 'experiencia' : 'navegar';
  }
  return 'palomear';
}

// ── La fila unificada ──

export interface Tarea {
  key: string;
  kind: 'bool' | 'quant' | 'agenda';
  gesto: TareaGesto;
  icon: string;
  name: string;
  color: string;
  momento: Momento;
  time: string;
  completed: boolean;
  meta?: string;
  route?: TareaRoute;
  weight?: number;
  /** 0..1 para cuantitativos. */
  progress?: number;
}

export interface TareaBlock {
  momento: Momento;
  label: string;
  items: Tarea[];
  done: number;
  total: number;
}

/** Rutas de los cuantitativos. Export MB-20.3 P4: el test
 * rutas-pantallas-reales las cruza contra los archivos de app/. */
export const QUANT_ROUTES: Record<string, string> = {
  water: '/hydration',
  protein: '/nutrition',
  steps: '/reports',
  sleep: '/sleep',
};

/**
 * MB-20.2 · 2.5: la ruta de un hábito sale del puente electrón→app
 * (electron-app-bridge, la fuente única de MB-19.2), nunca de un fallback
 * que invente destinos. Prioridad:
 *   1. Ruta granular del verificado — MB-20.3 P4: solo las DOS que divergen
 *      del puente (checkin → /checkin, cardio → /log-cardio), con su motivo
 *      escrito en day-booleans. Lo demás ya no se duplica aquí.
 *   2. La app del electrón según el puente, con su ruta del app-registry
 *      (sunlight → 'sol' → /solar).
 *   3. Nada. Los ELECTRONS_SIN_APP no están en el puente → sin ruta: se
 *      practican, no se abren (navegación honesta, cero puertas a lugares
 *      que no existen). El test del puente obliga a clasificar todo
 *      electrón nuevo, así que aquí no hay hueco posible.
 */
export function routeForBool(source: string): TareaRoute | undefined {
  const granular = (VERIFIED_ELECTRON_ROUTES as Record<string, TareaRoute>)[source];
  if (granular) return granular;
  const app = ELECTRON_TO_APP[source as ElectronSource];
  return app ? (APP_BY_KEY[app]?.route as TareaRoute | undefined) : undefined;
}

function boolToTarea(e: TareaBoolLike): Tarea {
  const gesto = gestoForBool(e.source);
  const route = routeForBool(e.source);
  return {
    key: e.source,
    kind: 'bool',
    gesto,
    icon: e.icon,
    name: e.name,
    color: e.color,
    momento: TAREA_MOMENTO[e.source] ?? 'tarde',
    time: TAREA_TIME[e.source] ?? '12:00',
    completed: e.completed,
    meta: `+${e.weight} e-`,
    route,
    weight: e.weight,
  };
}

function quantToTarea(q: TareaQuantLike): Tarea {
  const progress = q.target > 0 ? Math.min(1, q.current / q.target) : 0;
  return {
    key: q.source,
    kind: 'quant',
    gesto: q.source === 'water' ? 'inline' : 'navegar',
    icon: q.icon,
    name: q.name,
    color: q.color,
    momento: TAREA_MOMENTO[q.source] ?? 'tarde',
    time: TAREA_TIME[q.source] ?? '12:00',
    completed: progress >= 1,
    meta: `${q.displayCurrent} de ${q.displayTarget}`,
    route: QUANT_ROUTES[q.source],
    progress,
  };
}

/** De los items de agenda del compile solo entran los SMART accionables
 * (romper ayuno). Los eventos máquina viven en /agenda; los informativos
 * (comidas, sueño) no son tareas. Ayuno solo navega a su pantalla — con el
 * tap largo, como todo lo demás (MB-20.4). */
function smartAgendaTareas(items: TareaAgendaLike[]): Tarea[] {
  return items
    .filter((i) => i.isSmart && !i.informational)
    .map((i) => ({
      key: `agenda-${i.id}`,
      kind: 'agenda' as const,
      gesto: 'navegar' as const,
      icon: 'ayuno',
      name: i.name,
      color: '#EFD54F',
      momento: momentoForHour(Math.floor(minutesFromMidnight(i.time) / 60)),
      time: i.time,
      completed: i.completed,
      meta: i.subtitle,
      route: i.route,
    }));
}

export interface TareasInput {
  booleanElectrons: TareaBoolLike[];
  quantitativeElectrons: TareaQuantLike[];
  agendaItems: TareaAgendaLike[];
}

export interface TareasResult {
  blocks: TareaBlock[];
  /** Bloque de la hora actual (auto-foco al abrir). */
  focusMomento: Momento;
  global: { done: number; total: number };
}

/** La lente TAREAS: bloques por momento, con progreso por bloque y global. */
export function buildTareas(input: TareasInput, hour: number): TareasResult {
  const all: Tarea[] = [
    ...input.booleanElectrons.map(boolToTarea),
    ...input.quantitativeElectrons.map(quantToTarea),
    ...smartAgendaTareas(input.agendaItems),
  ];
  const blocks: TareaBlock[] = MOMENTOS.map((m) => {
    const items = all
      .filter((t) => t.momento === m)
      .sort((a, b) => minutesFromMidnight(a.time) - minutesFromMidnight(b.time) || a.key.localeCompare(b.key));
    return {
      momento: m,
      label: MOMENTO_LABELS[m],
      items,
      done: items.filter((t) => t.completed).length,
      total: items.length,
    };
  }).filter((b) => b.total > 0);
  return {
    blocks,
    focusMomento: momentoForHour(hour),
    global: {
      done: all.filter((t) => t.completed).length,
      total: all.length,
    },
  };
}

/** La lente AGENDA: la MISMA lista, ordenada por hora. Nunca dos fuentes. */
export function agendaLens(result: TareasResult): Tarea[] {
  return result.blocks
    .flatMap((b) => b.items)
    .sort((a, b) => minutesFromMidnight(a.time) - minutesFromMidnight(b.time) || a.key.localeCompare(b.key));
}

// ── El reparto de la lente TAREAS (MB-20.2 · 1.3) ──

export interface TareaBlockPendiente extends TareaBlock {
  /** Solo los items sin completar (los hechos viven en la cinta de arriba). */
  pending: Tarea[];
}

/**
 * HECHAS arriba como cinta (en orden cronológico) y abajo solo bloques con
 * pendientes. Recibe la lista de agenda ya calculada para no re-ordenar dos
 * veces la misma fuente. Los contadores done/total del bloque se conservan
 * completos: el encabezado dice "2 de 5" aunque solo pinte las 3 pendientes.
 */
export function repartoTareas(agendaItems: Tarea[], blocks: TareaBlock[]): {
  hechas: Tarea[];
  pendingBlocks: TareaBlockPendiente[];
} {
  return {
    hechas: agendaItems.filter((t) => t.completed),
    pendingBlocks: blocks
      .map((b) => ({ ...b, pending: b.items.filter((t) => !t.completed) }))
      .filter((b) => b.pending.length > 0),
  };
}

/**
 * A qué bloque va el auto-foco (MB-20.2 · 1.2). El bloque de la hora si tiene
 * pendientes; si ya quedó completo, el siguiente con pendientes; si hacia
 * adelante no queda ninguno pero atrás sí, el primero que siga pendiente.
 * Con el día terminado no hay foco (null): el usuario merece ver la cinta
 * de hechas completa, sin scroll.
 */
export function pickFocusMomento(
  pendientes: readonly Momento[],
  focusMomento: Momento,
): Momento | null {
  if (pendientes.includes(focusMomento)) return focusMomento;
  const idx = MOMENTOS.indexOf(focusMomento);
  const siguiente = MOMENTOS.slice(idx + 1).find((m) => pendientes.includes(m));
  return siguiente ?? pendientes[0] ?? null;
}
