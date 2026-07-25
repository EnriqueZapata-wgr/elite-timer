/**
 * Emotion History Core — mosaico y correlaciones cruzadas, lógica PURA
 * (MB-4 · Bloque 3 — el foso: ATP conoce tu sueño, entrenamiento, ciclo,
 * ayuno y sol; una app de mood solo conoce tu ánimo).
 *
 * ⚠️ HONESTIDAD ESTADÍSTICA OBLIGATORIA:
 *  - Con pocos registros NO se afirma correlación: mínimo MIN_DAYS_PER_GROUP
 *    días en CADA grupo (con factor / sin factor).
 *  - El lenguaje es de OBSERVACIÓN, nunca de causa: "los días que dormiste
 *    menos de 6 h reportaste ánimo más bajo", jamás "dormir poco te causa X".
 *  - Diferencias chicas (< MIN_DELTA en escala 1-10) = "sin patrón claro".
 *  - Si no hay señal suficiente, SE DICE.
 *
 * Sin imports de RN/supabase → Vitest node.
 */

export type HistoryRange = 'week' | 'month' | 'all';

export const RANGE_DAYS: Record<HistoryRange, number> = {
  week: 7,
  month: 30,
  all: 3650,
};

/** Subconjunto de un check-in que el historial necesita. */
export interface HistoryCheckin {
  emotions: string[];
  quadrant: string;
  pleasantness?: number | null;
  created_at: string;
}

// ═══ MOSAICO ═══

export interface MosaicEntry {
  emotionId: string;
  count: number;
}

/** Frecuencia por emoción, descendente (empate: alfabético — determinista). */
export function buildMosaic(checkins: HistoryCheckin[]): MosaicEntry[] {
  const counts = new Map<string, number>();
  for (const c of checkins) {
    for (const id of c.emotions ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([emotionId, count]) => ({ emotionId, count }))
    .sort((a, b) => b.count - a.count || (a.emotionId < b.emotionId ? -1 : 1));
}

// ═══ ÁNIMO POR DÍA ═══

/** Clave de día LOCAL (mismo criterio que checkin-bridge-core). */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface DayMood {
  date: string;
  /** Promedio 1-10 del día (pleasantness; fallback por cuadrante: 7/3). */
  pleasantness: number;
}

export function buildDayMoods(checkins: HistoryCheckin[]): DayMood[] {
  const byDay = new Map<string, number[]>();
  for (const c of checkins) {
    const p = typeof c.pleasantness === 'number' && c.pleasantness > 0
      ? c.pleasantness
      : (c.quadrant === 'high_pleasant' || c.quadrant === 'low_pleasant' ? 7 : 3);
    const key = localDayKey(c.created_at);
    const arr = byDay.get(key) ?? [];
    arr.push(p);
    byDay.set(key, arr);
  }
  return [...byDay.entries()]
    .map(([date, vals]) => ({ date, pleasantness: vals.reduce((s, v) => s + v, 0) / vals.length }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ═══ CORRELACIONES ═══

/** Mínimo de días en CADA grupo para atrevernos a mostrar un patrón. */
export const MIN_DAYS_PER_GROUP = 5;
/** Diferencia mínima (escala 1-10) para llamarlo patrón y no ruido. */
export const MIN_DELTA = 0.8;

export interface CorrelationDef {
  key: string;
  /** Nombre del factor para la UI ("Sueño", "Entrenamiento"…). */
  label: string;
  /** Descripción del grupo CON factor, en pasado 2ª persona ("dormiste menos de 6 h"). */
  withLabel: string;
  /** Descripción del grupo SIN factor ("dormiste 6 h o más"). */
  withoutLabel: string;
  /** Días (YYYY-MM-DD) en que el factor estuvo presente. */
  factorDates: string[];
  /**
   * Días en que el factor SE MIDIÓ (con o sin presencia). Si se omite, se
   * asume que todo día con check-in es medible (factores booleanos tipo
   * "entrenaste"). Para sueño solo cuentan días con dato de sueño.
   */
  measuredDates?: string[];
}

export type CorrelationStatus = 'signal' | 'no_signal' | 'insufficient';

export interface CorrelationResult {
  key: string;
  label: string;
  status: CorrelationStatus;
  withCount: number;
  withoutCount: number;
  withAvg: number | null;
  withoutAvg: number | null;
  /** Texto listo para UI — SIEMPRE lenguaje de observación, nunca de causa. */
  observation: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeCorrelation(moodDays: DayMood[], def: CorrelationDef): CorrelationResult {
  const factor = new Set(def.factorDates);
  const measured = def.measuredDates ? new Set(def.measuredDates) : null;

  const withVals: number[] = [];
  const withoutVals: number[] = [];
  for (const d of moodDays) {
    if (measured && !measured.has(d.date)) continue; // sin dato del factor ese día → fuera
    if (factor.has(d.date)) withVals.push(d.pleasantness);
    else withoutVals.push(d.pleasantness);
  }

  const base = {
    key: def.key,
    label: def.label,
    withCount: withVals.length,
    withoutCount: withoutVals.length,
  };

  if (withVals.length < MIN_DAYS_PER_GROUP || withoutVals.length < MIN_DAYS_PER_GROUP) {
    return {
      ...base,
      status: 'insufficient',
      withAvg: null,
      withoutAvg: null,
      observation: `Aún no hay suficientes días con check-in y dato de ${def.label.toLowerCase()} para decir algo honesto. Se necesitan al menos ${MIN_DAYS_PER_GROUP} días de cada lado.`,
    };
  }

  const withAvg = round1(withVals.reduce((s, v) => s + v, 0) / withVals.length);
  const withoutAvg = round1(withoutVals.reduce((s, v) => s + v, 0) / withoutVals.length);
  const delta = withAvg - withoutAvg;

  if (Math.abs(delta) < MIN_DELTA) {
    return {
      ...base,
      status: 'no_signal',
      withAvg,
      withoutAvg,
      observation: `Por ahora no se ve un patrón claro entre ${def.label.toLowerCase()} y tu ánimo (${withAvg} vs ${withoutAvg}). Con más registros esto se afina.`,
    };
  }

  const direction = delta > 0 ? 'más alto' : 'más bajo';
  return {
    ...base,
    status: 'signal',
    withAvg,
    withoutAvg,
    // Observación, no causa: describe lo que reportaste, no por qué.
    observation: `Los días que ${def.withLabel} reportaste un ánimo ${direction}: ${withAvg}/10 en promedio, vs ${withoutAvg}/10 los días que ${def.withoutLabel}.`,
  };
}

// ═══ CONSCIENCIA DE CICLO (bidireccional: la fase explica, no excusa) ═══

export const MIN_DAYS_PER_PHASE = 3;

export interface PhaseBreakdownEntry {
  phase: string;
  days: number;
  avg: number;
}

export interface PhaseBreakdown {
  status: 'ok' | 'insufficient';
  entries: PhaseBreakdownEntry[];
}

/**
 * Ánimo promedio por fase del ciclo. Solo fases con MIN_DAYS_PER_PHASE+ días
 * entran; si ninguna llega, el resultado completo es 'insufficient'.
 */
export function computePhaseBreakdown(
  moodDays: DayMood[],
  phaseByDate: Record<string, string>,
): PhaseBreakdown {
  const byPhase = new Map<string, number[]>();
  for (const d of moodDays) {
    const phase = phaseByDate[d.date];
    if (!phase) continue;
    const arr = byPhase.get(phase) ?? [];
    arr.push(d.pleasantness);
    byPhase.set(phase, arr);
  }
  const entries = [...byPhase.entries()]
    .filter(([, vals]) => vals.length >= MIN_DAYS_PER_PHASE)
    .map(([phase, vals]) => ({
      phase,
      days: vals.length,
      avg: round1(vals.reduce((s, v) => s + v, 0) / vals.length),
    }))
    .sort((a, b) => (a.phase < b.phase ? -1 : 1));
  return { status: entries.length >= 2 ? 'ok' : 'insufficient', entries };
}

// ═══ FILTRO DE RANGO ═══

export function filterByRange<T extends { created_at: string }>(
  items: T[],
  range: HistoryRange,
  now: Date = new Date(),
): T[] {
  const cutoff = now.getTime() - RANGE_DAYS[range] * 86400000;
  return items.filter((i) => {
    const t = new Date(i.created_at).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}
