/**
 * Adherencia de suplementos — lógica pura (#54, Sprint NUTRICIÓN T4).
 *
 * La adherencia semanal se mide contra el dose_pattern de cada suplemento
 * (no todos son diarios): '1× diario' espera 7 días/semana, 'lun/mié/vie'
 * espera 3, 'semanal' 1. MB-2: la adherencia se mide por TOMA real
 * (Σ tomas tomadas / Σ tomas esperadas), consistente con
 * supplementsTodayProgress — antes (v1) un día con 1 de 2 tomas contaba
 * como día completo. Con multi-dosis (188) cada log trae dose_index; el
 * conteo dedupea por (fecha, dose_index) y capea por día al nº de tomas
 * del suplemento (takenDosesBySupplement).
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
  /** Nº de tomas/día del suplemento (doseCountFor(dose_times)). */
  doseCount: number;
  /** Tomas registradas en la ventana de 7 días (takenDosesBySupplement). */
  takenDoses: number;
}

/**
 * % de adherencia semanal (0-100) POR TOMA (MB-2): por suplemento,
 * tomas esperadas = días esperados del patrón × tomas/día, y el
 * cumplimiento es Σ tomadas / Σ esperadas (cap 100% por suplemento —
 * tomar de más no compensa otro suplemento olvidado). El % final es el
 * promedio entre suplementos. Sin suplementos → null (no aplica).
 */
export function weeklyAdherencePct(supplements: SupplementAdherenceInput[]): number | null {
  if (supplements.length === 0) return null;
  const sum = supplements.reduce((acc, s) => {
    const doseCount = Math.max(1, s.doseCount || 1);
    const expected = expectedDaysPerWeek(s.dosePattern) * doseCount;
    return acc + Math.min(1, expected > 0 ? s.takenDoses / expected : 0);
  }, 0);
  return Math.round((sum / supplements.length) * 100);
}

// ═══ Multi-dosis por día (migración 188 — Sprint SUPS+BHA) ═══

/** Etiquetas de toma disponibles en UI (dose_times acepta también HH:MM). */
export const DOSE_TIME_LABELS = ['mañana', 'comida', 'tarde', 'noche'] as const;

// ═══ Hora custom HH:MM en dose_times (MB-2 §4) ═══
// El esquema y la agenda ya aceptan HH:MM (agenda-service resuelve la hora
// con regex); estos helpers cierran la UI: validación del input y orden
// cronológico del multiselect mezclando etiquetas y horas.

/** Minutos de referencia de cada etiqueta (mismos que agenda-service). */
const LABEL_MINUTES: Record<string, number> = {
  'mañana': 8 * 60, 'comida': 14 * 60, 'tarde': 17 * 60, 'noche': 21 * 60,
};

/** ¿La entrada de dose_times es una hora custom (no etiqueta)? */
export function isCustomDoseTime(entry: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(entry);
}

/**
 * Normaliza el input de hora custom a 'HH:MM' (acepta '8:30', '08:30' y
 * dígitos corridos '830'/'0830'). Inválido / fuera de rango → null.
 */
export function normalizeDoseTimeInput(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let h: number; let m: number;
  const colon = s.match(/^(\d{1,2}):(\d{2})$/);
  const bare = s.match(/^(\d{1,2})(\d{2})$/); // 830 → 8:30, 0830 → 08:30
  if (colon) {
    h = Number(colon[1]); m = Number(colon[2]);
  } else if (bare) {
    h = Number(bare[1]); m = Number(bare[2]);
  } else {
    return null;
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Ordena dose_times cronológicamente mezclando etiquetas (mañana=08:00,
 * comida=14:00, tarde=17:00, noche=21:00) y horas custom. Entradas
 * desconocidas van al final. Los dose_index de los logs siguen el orden del
 * array (comportamiento existente al editar tomas).
 */
export function sortDoseTimes(times: readonly string[]): string[] {
  const minutesOf = (t: string): number => {
    if (t in LABEL_MINUTES) return LABEL_MINUTES[t];
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    return Number.MAX_SAFE_INTEGER;
  };
  return [...times].sort((a, b) => minutesOf(a) - minutesOf(b));
}

/** Nº de tomas/día de un suplemento. dose_times NULL/vacío = 1 toma (legacy). */
export function doseCountFor(doseTimes: readonly string[] | null | undefined): number {
  if (!Array.isArray(doseTimes)) return 1;
  const valid = doseTimes.filter((t) => typeof t === 'string' && t.trim());
  return Math.max(1, valid.length);
}

/**
 * Tomas registradas por suplemento en la ventana (MB-2: adherencia por TOMA).
 * Dedupe por (fecha, dose_index) y cap POR DÍA al nº de tomas del suplemento
 * (`doseCounts`) — logs huérfanos de dosis eliminadas no inflan, mismo
 * criterio que supplementsTodayProgress. dose_index null → 0 (legacy).
 */
export function takenDosesBySupplement(
  logs: { supplement_id: string; date: string; dose_index?: number | null; taken: boolean }[],
  doseCounts: Record<string, number>,
): Record<string, number> {
  // supplement_id → fecha → set de dose_index tomados
  const bySupp = new Map<string, Map<string, Set<number>>>();
  for (const l of logs) {
    if (!l.taken || !l.supplement_id || !l.date) continue;
    if (!(l.supplement_id in doseCounts)) continue; // solo activos
    const idx = Number.isFinite(Number(l.dose_index)) ? Number(l.dose_index) : 0;
    let byDate = bySupp.get(l.supplement_id);
    if (!byDate) {
      byDate = new Map();
      bySupp.set(l.supplement_id, byDate);
    }
    let set = byDate.get(l.date);
    if (!set) {
      set = new Set();
      byDate.set(l.date, set);
    }
    set.add(idx);
  }
  const out: Record<string, number> = {};
  for (const [id, byDate] of bySupp) {
    const cap = Math.max(1, doseCounts[id] ?? 1);
    let total = 0;
    for (const set of byDate.values()) total += Math.min(set.size, cap);
    out[id] = total;
  }
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
