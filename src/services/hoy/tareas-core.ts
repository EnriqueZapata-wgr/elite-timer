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
  pillarRoute?: TareaRoute;
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

/** Qué hace el tap largo en cada fila. El tap simple SIEMPRE navega. */
export type TareaGesto = 'palomear' | 'experiencia' | 'inline' | 'navegar';

/** Experiencias: palomear no regala el check — pregunta primero. */
export const EXPERIENCIA_SOURCES: readonly string[] = [
  'meditation', 'breathwork', 'strength', 'journal', 'nback', 'cardio',
];

/** Experiencias con captura externa limpia (existe writer real de sesión):
 * mind_sessions para meditar/respirar, cardio_sessions manual para cardio.
 * Journal, N-Back y Entrenar registran EN su pantalla: el SÍ navega. */
export const EXPERIENCIA_CAPTURA: readonly string[] = [
  'meditation', 'breathwork', 'cardio',
];

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

const QUANT_ROUTES: Record<string, string> = {
  water: '/hydration',
  protein: '/nutrition',
  steps: '/reports',
  sleep: '/sleep',
};

function boolToTarea(e: TareaBoolLike): Tarea {
  const gesto = gestoForBool(e.source);
  const route: TareaRoute | undefined =
    (VERIFIED_ELECTRON_ROUTES as Record<string, string>)[e.source] ?? e.pillarRoute;
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
 * (comidas, sueño) no son tareas. Ayuno navega a su pantalla y fin. */
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
      momento: momentoForHour(parseInt(i.time.slice(0, 2), 10) || 12),
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
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.key.localeCompare(b.key)));
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
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.key.localeCompare(b.key)));
}
