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
// MB-26 P6: de dónde salió la hora (se borra al compilar; solo el tipo).
import type { HoraFuente } from '@/src/services/hoy/habit-times-core';

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

/** El TAP hace LA ACCIÓN PRINCIPAL de cada fila (MB-20.5: solo DOS tipos —
 * el modal murió; el registro manual vive dentro de cada módulo):
 *   'palomear' → tap palomea; tap largo navega si hay ruta.
 *   'navegar'  → tap navega (su única acción); tap largo nada.
 *   'inline'   → los botones capturan; el tap del resto navega. */
export type TareaGesto = 'palomear' | 'inline' | 'navegar';

/** Verificado ⇒ su check nace de actividad real: el tap abre el módulo (ahí
 * vive también el registro manual). Lo demás se palomea por declaración. */
export function gestoForBool(source: string): TareaGesto {
  return (VERIFIED_ELECTRON_KEYS as readonly string[]).includes(source)
    ? 'navegar'
    : 'palomear';
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

/**
 * MB-23 P4: hora y momento efectivos de un hábito. La hora canónica vivía
 * SOLO en el código; ahora el usuario puede moverla por hábito
 * (user_day_preferences.goals.habit_times, sin migración: mismo jsonb de
 * siempre). Con override el momento se DERIVA de la hora — mover meditación
 * a las 20:00 la lleva al bloque NOCHE; sin override, todo igual que hoy.
 */
export function tareaTiming(
  source: string,
  habitTimes?: Record<string, string>,
): { momento: Momento; time: string } {
  const override = habitTimes?.[source];
  const m = override ? /^(\d{1,2}):(\d{2})$/.exec(override) : null;
  if (m && parseInt(m[1], 10) <= 23 && parseInt(m[2], 10) <= 59) {
    return {
      momento: momentoForHour(Math.floor(minutesFromMidnight(override!) / 60)),
      time: override!,
    };
  }
  return { momento: TAREA_MOMENTO[source] ?? 'tarde', time: TAREA_TIME[source] ?? '12:00' };
}

/** MB-26 P6: la fila del sol dice de dónde salió su hora — honestidad de
 *  la degradación ('sin dato UV' cuando cayó a despertar + 30). */
function notaFuente(fuente?: HoraFuente): string {
  if (fuente === 'uv') return ' · ventana UV';
  if (fuente === 'uv_fallback') return ' · sin dato UV';
  return '';
}

function boolToTarea(
  e: TareaBoolLike,
  habitTimes?: Record<string, string>,
  horaFuentes?: Record<string, HoraFuente>,
): Tarea {
  const gesto = gestoForBool(e.source);
  const route = routeForBool(e.source);
  return {
    key: e.source,
    kind: 'bool',
    gesto,
    icon: e.icon,
    name: e.name,
    color: e.color,
    ...tareaTiming(e.source, habitTimes),
    completed: e.completed,
    meta: `+${e.weight} e-${notaFuente(horaFuentes?.[e.source])}`,
    route,
    weight: e.weight,
  };
}

function quantToTarea(q: TareaQuantLike, habitTimes?: Record<string, string>): Tarea {
  const progress = q.target > 0 ? Math.min(1, q.current / q.target) : 0;
  return {
    key: q.source,
    kind: 'quant',
    gesto: q.source === 'water' ? 'inline' : 'navegar',
    icon: q.icon,
    name: q.name,
    color: q.color,
    ...tareaTiming(q.source, habitTimes),
    completed: progress >= 1,
    meta: `${q.displayCurrent} de ${q.displayTarget}`,
    route: QUANT_ROUTES[q.source],
    progress,
  };
}

/** De los items de agenda del compile solo entran los SMART accionables
 * (romper ayuno). Los eventos máquina viven en /agenda; los informativos
 * (comidas, sueño) no son tareas. Ayuno es 'navegar': su acción principal
 * (y única) es abrirse, así que el tap navega y fin (ajuste MB-20.4). */
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
  /** MB-23 P4: overrides de hora por hábito (source → 'HH:MM'). */
  habitTimes?: Record<string, string>;
  /** MB-26 P6: fuente de cada hora (la fila del sol dice si cayó al respaldo). */
  horaFuentes?: Record<string, HoraFuente>;
}

export interface TareasResult {
  blocks: TareaBlock[];
  global: { done: number; total: number };
}

/** La lente TAREAS: bloques por momento, con progreso por bloque y global. */
export function buildTareas(input: TareasInput): TareasResult {
  const all: Tarea[] = [
    ...input.booleanElectrons.map((e) => boolToTarea(e, input.habitTimes, input.horaFuentes)),
    ...input.quantitativeElectrons.map((q) => quantToTarea(q, input.habitTimes)),
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
