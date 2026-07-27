/**
 * Emotion Stats Core — reporteo profundo del pilar emocional, lógica PURA
 * (MB-9 · Track C). El foso: ATP no solo sabe cómo te sentiste, sabe cuándo se
 * te cae el ánimo, con qué se asocia, y — con la navegación — si moverte
 * funcionó. Eso último es imposible para una app que solo te ubica.
 *
 * ⚠️ HONESTIDAD OBLIGATORIA (misma doctrina que emotion-history-core):
 *  - Lenguaje de ASOCIACIÓN, nunca de causa.
 *  - CERO comparación con otros usuarios en salud emocional.
 *  - Con pocos registros NO se afirma nada: cada reporte dice QUÉ LE FALTA para
 *    existir (C.2 · vacíos que informan), no muestra un cero triste.
 *
 * Sin imports de RN/supabase → Vitest node. Reusa la biblioteca de emociones
 * (import seguro en node) solo para clasificar cuadrante/valencia.
 */
import { EMOTIONS, type QuadrantKey } from '../data/emotions-library';

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));
const round1 = (n: number) => Math.round(n * 10) / 10;

const PLEASANT_QUADRANTS = new Set<string>(['high_pleasant', 'low_pleasant']);
const isPleasantQuadrant = (q: string) => PLEASANT_QUADRANTS.has(q);

/** Subconjunto de un check-in que la estadística necesita. */
export interface StatsCheckin {
  emotions?: string[];
  quadrant: string;
  pleasantness?: number | null;
  context_where?: string | null;
  context_who?: string | null;
  context_doing?: string | null;
  created_at: string;
}

/** Ánimo 1-10 de un check-in: pleasantness si existe; si no, fallback 7/3 por lado. */
export function moodValue(c: { pleasantness?: number | null; quadrant: string }): number {
  if (typeof c.pleasantness === 'number' && c.pleasantness > 0) return c.pleasantness;
  return isPleasantQuadrant(c.quadrant) ? 7 : 3;
}

/** Ánimo base implícito de una emoción por su cuadrante (para efectividad de navegación). */
export function emotionBaselineMood(emotionId: string): number | null {
  const e = BY_ID.get(emotionId);
  if (!e) return null;
  return isPleasantQuadrant(e.quadrant) ? 6.5 : 3.5;
}

// ═══ C.1 · PATRÓN POR DÍA DE LA SEMANA Y POR HORA ═══

/** Mínimo de check-ins totales para atrevernos a mostrar un patrón temporal. */
export const MIN_CHECKINS_FOR_PATTERN = 5;
/** Mínimo por segmento (día/franja) para que ese segmento cuente como señal. */
export const MIN_PER_SEGMENT = 2;

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface SegmentStat {
  key: string;
  label: string;
  count: number;
  avg: number | null;
}

export interface PatternReport {
  status: 'ok' | 'insufficient';
  /** Cuántos check-ins más se necesitan para empezar a ver el patrón (C.2). */
  needMore: number;
  segments: SegmentStat[];
  /** Segmento con el ánimo más bajo entre los que tienen señal suficiente. */
  lowest: SegmentStat | null;
  /** Segmento con el ánimo más alto entre los que tienen señal suficiente. */
  highest: SegmentStat | null;
}

function summarizeSegments(
  buckets: Map<string, { label: string; vals: number[] }>,
  order: string[],
  total: number,
): PatternReport {
  const segments: SegmentStat[] = order.map((key) => {
    const b = buckets.get(key);
    const vals = b?.vals ?? [];
    return {
      key,
      label: b?.label ?? key,
      count: vals.length,
      avg: vals.length ? round1(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
    };
  });
  if (total < MIN_CHECKINS_FOR_PATTERN) {
    return { status: 'insufficient', needMore: MIN_CHECKINS_FOR_PATTERN - total, segments, lowest: null, highest: null };
  }
  const withSignal = segments.filter((s) => s.count >= MIN_PER_SEGMENT && s.avg != null);
  if (withSignal.length < 2) {
    return { status: 'insufficient', needMore: 0, segments, lowest: null, highest: null };
  }
  const sorted = [...withSignal].sort((a, b) => (a.avg! - b.avg!) || (a.key < b.key ? -1 : 1));
  return { status: 'ok', needMore: 0, segments, lowest: sorted[0], highest: sorted[sorted.length - 1] };
}

/** Ánimo promedio por día de la semana (¿qué día se te cae?). */
export function buildWeekdayPattern(checkins: StatsCheckin[]): PatternReport {
  const buckets = new Map<string, { label: string; vals: number[] }>();
  for (let i = 0; i < 7; i++) buckets.set(String(i), { label: WEEKDAY_LABELS[i], vals: [] });
  for (const c of checkins) {
    const wd = new Date(c.created_at).getDay();
    if (!Number.isFinite(wd)) continue;
    buckets.get(String(wd))!.vals.push(moodValue(c));
  }
  return summarizeSegments(buckets, ['0', '1', '2', '3', '4', '5', '6'], checkins.length);
}

/** Franjas del día para el patrón horario (¿a qué hora se te cae el ánimo?). */
const DAY_PARTS: { key: string; label: string; from: number; to: number }[] = [
  { key: 'madrugada', label: 'Madrugada', from: 0, to: 5 },
  { key: 'manana', label: 'Mañana', from: 6, to: 11 },
  { key: 'tarde', label: 'Tarde', from: 12, to: 17 },
  { key: 'noche', label: 'Noche', from: 18, to: 23 },
];

/** Ánimo promedio por franja del día. */
export function buildDayPartPattern(checkins: StatsCheckin[]): PatternReport {
  const buckets = new Map<string, { label: string; vals: number[] }>();
  for (const p of DAY_PARTS) buckets.set(p.key, { label: p.label, vals: [] });
  for (const c of checkins) {
    const h = new Date(c.created_at).getHours();
    if (!Number.isFinite(h)) continue;
    const part = DAY_PARTS.find((p) => h >= p.from && h <= p.to);
    if (part) buckets.get(part.key)!.vals.push(moodValue(c));
  }
  return summarizeSegments(buckets, DAY_PARTS.map((p) => p.key), checkins.length);
}

// ═══ C.2 · DISTRIBUCIÓN POR CUADRANTE + TENDENCIA VS PERIODO ANTERIOR ═══

export interface QuadrantShare {
  quadrant: QuadrantKey;
  count: number;
  pct: number;
  /** % en el periodo anterior (null si no hay periodo previo comparable). */
  prevPct: number | null;
  /** Cambio en puntos porcentuales vs el periodo anterior (null si no aplica). */
  deltaPct: number | null;
}

export interface DistributionReport {
  status: 'ok' | 'insufficient';
  needMore: number;
  total: number;
  shares: QuadrantShare[];
}

const QUADRANT_ORDER: QuadrantKey[] = ['high_pleasant', 'high_unpleasant', 'low_pleasant', 'low_unpleasant'];

function tally(checkins: StatsCheckin[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of checkins) m.set(c.quadrant, (m.get(c.quadrant) ?? 0) + 1);
  return m;
}

/**
 * Distribución por cuadrante del periodo + tendencia contra el periodo anterior.
 * La tendencia solo se calcula si el periodo previo tiene señal suficiente.
 */
export function buildQuadrantDistribution(
  checkins: StatsCheckin[],
  prevCheckins: StatsCheckin[] = [],
): DistributionReport {
  const total = checkins.length;
  if (total < MIN_CHECKINS_FOR_PATTERN) {
    return { status: 'insufficient', needMore: MIN_CHECKINS_FOR_PATTERN - total, total, shares: [] };
  }
  const now = tally(checkins);
  const prev = tally(prevCheckins);
  const prevTotal = prevCheckins.length;
  const comparablePrev = prevTotal >= MIN_CHECKINS_FOR_PATTERN;

  const shares: QuadrantShare[] = QUADRANT_ORDER.map((q) => {
    const count = now.get(q) ?? 0;
    const pct = round1((count / total) * 100);
    const prevPct = comparablePrev ? round1(((prev.get(q) ?? 0) / prevTotal) * 100) : null;
    const deltaPct = prevPct != null ? round1(pct - prevPct) : null;
    return { quadrant: q, count, pct, prevPct, deltaPct };
  });
  return { status: 'ok', needMore: 0, total, shares };
}

// ═══ DISPARADORES FRECUENTES (contexto de los estados desagradables) ═══

export const MIN_TRIGGER_SUPPORT = 3;

export interface TriggerStat {
  dimension: 'where' | 'who' | 'doing';
  value: string;
  /** Veces que este contexto acompañó un check-in DESAGRADABLE. */
  count: number;
}

export interface TriggersReport {
  status: 'ok' | 'insufficient';
  /** Check-ins desagradables que faltan para empezar a leer disparadores. */
  needMore: number;
  triggers: TriggerStat[];
}

/**
 * Disparadores: contextos (dónde / con quién / qué hacías) que MÁS acompañan a
 * tus estados desagradables. Asociación, no causa: es lo que estaba presente,
 * no lo que lo provocó. Solo se reportan los que superan un soporte mínimo.
 */
export function buildTriggers(checkins: StatsCheckin[]): TriggersReport {
  const unpleasant = checkins.filter((c) => !isPleasantQuadrant(c.quadrant));
  if (unpleasant.length < MIN_CHECKINS_FOR_PATTERN) {
    return { status: 'insufficient', needMore: MIN_CHECKINS_FOR_PATTERN - unpleasant.length, triggers: [] };
  }
  const dims: [TriggerStat['dimension'], (c: StatsCheckin) => string | null | undefined][] = [
    ['where', (c) => c.context_where],
    ['who', (c) => c.context_who],
    ['doing', (c) => c.context_doing],
  ];
  const counts = new Map<string, TriggerStat>();
  for (const [dimension, pick] of dims) {
    for (const c of unpleasant) {
      const v = pick(c);
      if (!v || v === 'Otro') continue;
      const key = `${dimension}|${v}`;
      const cur = counts.get(key) ?? { dimension, value: v, count: 0 };
      cur.count += 1;
      counts.set(key, cur);
    }
  }
  const triggers = [...counts.values()]
    .filter((t) => t.count >= MIN_TRIGGER_SUPPORT)
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1))
    .slice(0, 5);
  return { status: triggers.length ? 'ok' : 'insufficient', needMore: 0, triggers };
}

// ═══ RACHA DE ESCUCHA + CONSISTENCIA ═══

/** Clave de día LOCAL (mismo criterio que emotion-history-core). */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface ConsistencyReport {
  daysWithCheckin: number;
  windowDays: number;
  consistencyPct: number;
  /** Racha activa terminando hoy o ayer (días consecutivos con check-in). */
  currentStreak: number;
  longestStreak: number;
}

function shiftKey(base: Date, backDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() - backDays);
  return localDayKey(d.toISOString());
}

/** Racha de escucha y consistencia en una ventana de días. */
export function buildConsistency(
  checkins: StatsCheckin[],
  windowDays: number,
  now: Date = new Date(),
): ConsistencyReport {
  const days = new Set(checkins.map((c) => localDayKey(c.created_at)));
  const daysWithCheckin = days.size;
  const consistencyPct = windowDays > 0 ? round1((daysWithCheckin / windowDays) * 100) : 0;

  // Racha activa: cuenta hacia atrás desde hoy (o ayer si hoy aún no hay).
  const todayKey = localDayKey(now.toISOString());
  let start = days.has(todayKey) ? 0 : 1;
  let currentStreak = 0;
  for (let back = start; back < windowDays + 2; back++) {
    if (days.has(shiftKey(now, back))) currentStreak += 1;
    else break;
  }

  // Racha más larga observada dentro de la ventana.
  const sortedKeys = [...days].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sortedKeys) {
    if (prev && shiftKey(new Date(`${key}T12:00:00`), 1) === prev) run += 1;
    else run = 1;
    if (run > longestStreak) longestStreak = run;
    prev = key;
  }
  return { daysWithCheckin, windowDays, consistencyPct, currentStreak, longestStreak };
}

// ═══ C.1 · EFECTIVIDAD DE LA NAVEGACIÓN (el diferenciador) ═══

/** Un movimiento de navegación que el usuario tomó, tal como se persiste. */
export interface NavEvent {
  emotion_id: string;
  move: string;
  created_at: string;
}

/** Ventana para buscar el "siguiente check-in" tras un movimiento (horas). */
export const NAV_FOLLOWUP_WINDOW_H = 72;
/** Mejora mínima (escala 1-10) para contar el siguiente check-in como "mejor". */
export const NAV_IMPROVE_DELTA = 0.5;
/** Muestras mínimas por movimiento para reportar su efectividad (honestidad). */
export const MIN_NAV_SAMPLES = 3;

export interface MoveEfficacy {
  move: string;
  sampled: number;
  improved: number;
  /** Fracción 0-1 de veces que el siguiente check-in mejoró (null si sin muestra). */
  rate: number | null;
}

export interface EfficacyReport {
  status: 'ok' | 'insufficient';
  /** Movimientos con datos suficientes; los demás quedan fuera hasta juntar muestra. */
  moves: MoveEfficacy[];
  /** Movimientos observados pero aún sin muestra suficiente (C.2). */
  pending: { move: string; sampled: number; needMore: number }[];
}

/**
 * Efectividad de la navegación: por cada movimiento tomado, busca el siguiente
 * check-in dentro de la ventana y mide si tu ánimo se movió en la dirección
 * propuesta respecto al estado de origen. "Cuando bajas con respiración, tu
 * siguiente check-in mejora 7 de cada 10 veces." Asociación, no promesa.
 *
 * Solo aplica a movimientos que BUSCAN mejorar el ánimo (bajar, reencuadrar,
 * cruzar, subir). Saborear/canalizar sostienen un buen estado: no se evalúan
 * como "mejora".
 */
const IMPROVING_MOVES = new Set(['bajar', 'reencuadrar', 'cruzar', 'subir']);

export function computeNavigationEfficacy(
  events: NavEvent[],
  checkins: StatsCheckin[],
): EfficacyReport {
  const sortedCheckins = [...checkins].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const windowMs = NAV_FOLLOWUP_WINDOW_H * 3600000;

  const perMove = new Map<string, { sampled: number; improved: number }>();
  for (const ev of events) {
    if (!IMPROVING_MOVES.has(ev.move)) continue;
    const baseline = emotionBaselineMood(ev.emotion_id);
    if (baseline == null) continue;
    const evTime = new Date(ev.created_at).getTime();
    if (!Number.isFinite(evTime)) continue;
    // Siguiente check-in ESTRICTAMENTE posterior al movimiento, dentro de ventana.
    const next = sortedCheckins.find((c) => {
      const t = new Date(c.created_at).getTime();
      return t > evTime && t - evTime <= windowMs;
    });
    if (!next) continue;
    const cur = perMove.get(ev.move) ?? { sampled: 0, improved: 0 };
    cur.sampled += 1;
    if (moodValue(next) >= baseline + NAV_IMPROVE_DELTA) cur.improved += 1;
    perMove.set(ev.move, cur);
  }

  const moves: MoveEfficacy[] = [];
  const pending: EfficacyReport['pending'] = [];
  for (const [move, { sampled, improved }] of [...perMove.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (sampled >= MIN_NAV_SAMPLES) {
      moves.push({ move, sampled, improved, rate: improved / sampled });
    } else {
      pending.push({ move, sampled, needMore: MIN_NAV_SAMPLES - sampled });
    }
  }
  return { status: moves.length ? 'ok' : 'insufficient', moves, pending };
}
