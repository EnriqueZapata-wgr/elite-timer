/**
 * Adherencia de suplementos — lógica pura (#54, Sprint NUTRICIÓN T4).
 *
 * La adherencia semanal se mide contra el dose_pattern de cada suplemento
 * (no todos son diarios): '1× diario' espera 7 días/semana, 'lun/mié/vie'
 * espera 3, 'semanal' 1. supplement_logs es binario por día (UNIQUE
 * user+supp+date), así que '2× diario' también se mide por días (v1).
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
