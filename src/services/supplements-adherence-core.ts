/**
 * Adherencia de suplementos — lógica pura (#54, Sprint NUTRICIÓN T4).
 *
 * La adherencia semanal se mide contra el dose_pattern de cada suplemento
 * (no todos son diarios): '1× diario' espera 7 días/semana, 'lun/mié/vie'
 * espera 3, 'semanal' 1. La adherencia se sigue midiendo por DÍAS (v1):
 * con multi-dosis (188) puede haber varios logs por día (dose_index) — el
 * conteo de días tomados debe dedupear por fecha (takenDaysBySupplement).
 */

export const DOSE_PATTERNS = ['1× diario', '2× diario', 'lun/mié/vie', 'semanal'] as const;
export type DosePattern = typeof DOSE_PATTERNS[number];

/** Días esperados de toma en una ventana de 7 días según patrón. */
export function expectedDaysPerWeek(pattern: string | null | undefined): number {
  switch (pattern) {
    case 'lun/mié/vie': return 3;
    case 'semanal': return 1;
    case '1× diario':
    case '2× diario':
    default:
      return 7; // sin patrón (legacy) se asume diario
  }
}

export interface SupplementAdherenceInput {
  /** dose_pattern del suplemento (null = legacy diario). */
  dosePattern: string | null;
  /** Días con log taken=true en la ventana de 7 días. */
  takenDays: number;
}

/**
 * % de adherencia semanal (0-100): promedio del cumplimiento de cada
 * suplemento contra su patrón (cap 100% por suplemento — tomar de más no
 * compensa otro suplemento olvidado). Sin suplementos → null (no aplica).
 */
export function weeklyAdherencePct(supplements: SupplementAdherenceInput[]): number | null {
  if (supplements.length === 0) return null;
  const sum = supplements.reduce((acc, s) => {
    const expected = expectedDaysPerWeek(s.dosePattern);
    return acc + Math.min(1, expected > 0 ? s.takenDays / expected : 0);
  }, 0);
  return Math.round((sum / supplements.length) * 100);
}

// ═══ Multi-dosis por día (migración 188 — Sprint SUPS+BHA) ═══

/** Etiquetas de toma disponibles en UI (dose_times acepta también HH:MM). */
export const DOSE_TIME_LABELS = ['mañana', 'comida', 'tarde', 'noche'] as const;

/** Nº de tomas/día de un suplemento. dose_times NULL/vacío = 1 toma (legacy). */
export function doseCountFor(doseTimes: readonly string[] | null | undefined): number {
  if (!Array.isArray(doseTimes)) return 1;
  const valid = doseTimes.filter((t) => typeof t === 'string' && t.trim());
  return Math.max(1, valid.length);
}

/**
 * Días con ≥1 log taken por suplemento, DEDUPE por fecha (con multi-dosis un
 * mismo día puede tener N logs — cuenta como 1 día para la adherencia v1).
 */
export function takenDaysBySupplement(
  logs: { supplement_id: string; date: string; taken: boolean }[],
): Record<string, number> {
  const daysBySupp = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!l.taken || !l.supplement_id || !l.date) continue;
    let set = daysBySupp.get(l.supplement_id);
    if (!set) {
      set = new Set();
      daysBySupp.set(l.supplement_id, set);
    }
    set.add(l.date);
  }
  const out: Record<string, number> = {};
  for (const [id, set] of daysBySupp) out[id] = set.size;
  return out;
}

/**
 * Progreso del día para la card SUPLEMENTOS del HOY con multi-dosis:
 * total = Σ tomas de los suplementos activos (N tomas = N checks),
 * taken = tomas registradas hoy (dedupe por supp+dose_index, cap al nº de
 * tomas del suplemento — logs huérfanos de dosis eliminadas no inflan).
 */
export function supplementsTodayProgress(
  supps: { id: string; dose_times?: string[] | null }[],
  logs: { supplement_id: string; dose_index?: number | null; taken: boolean }[],
): { total: number; taken: number } {
  const doseCap = new Map<string, number>();
  let total = 0;
  for (const s of supps) {
    const n = doseCountFor(s.dose_times);
    doseCap.set(s.id, n);
    total += n;
  }
  const takenBySupp = new Map<string, Set<number>>();
  for (const l of logs) {
    if (!l.taken) continue;
    if (!doseCap.has(l.supplement_id)) continue; // solo activos
    const idx = Number.isFinite(Number(l.dose_index)) ? Number(l.dose_index) : 0;
    let set = takenBySupp.get(l.supplement_id);
    if (!set) {
      set = new Set();
      takenBySupp.set(l.supplement_id, set);
    }
    set.add(idx);
  }
  let taken = 0;
  for (const [id, set] of takenBySupp) {
    taken += Math.min(set.size, doseCap.get(id) ?? 1);
  }
  return { total, taken };
}
