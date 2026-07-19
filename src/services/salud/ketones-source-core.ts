/**
 * Cetonas — modelo de las 3 fuentes de medición (#113, MB-8). Núcleo PURO.
 *
 * Cada fuente mide algo distinto y en unidad distinta — mezclarlas fue el bug:
 *  · sangre  → β-hidroxibutirato (mmol/L), el estándar de cetosis.
 *  · aliento → acetona (ppm), medidor de aliento.
 *  · orina   → acetoacetato, tira reactiva CUALITATIVA (no numérica fiable).
 *
 * El core no toca supabase/RN: da labels, rangos y validación por fuente para
 * que la UI y el guardado sean consistentes.
 */

export type KetoneSource = 'blood' | 'breath' | 'urine';

export const KETONE_SOURCES: { id: KetoneSource; name: string; unit: string; icon: string }[] = [
  { id: 'blood',  name: 'Sangre',  unit: 'mmol/L', icon: 'water-outline' },
  { id: 'breath', name: 'Aliento', unit: 'ppm',    icon: 'cloud-outline' },
  { id: 'urine',  name: 'Orina',   unit: '',       icon: 'flask-outline' },
];

/** Niveles cualitativos de tira de orina (acetoacetato), de menor a mayor. */
export const URINE_LEVELS: { id: string; name: string }[] = [
  { id: 'negative', name: 'Negativo' },
  { id: 'trace',    name: 'Trazas' },
  { id: 'small',    name: 'Pequeña' },
  { id: 'moderate', name: 'Moderada' },
  { id: 'large',    name: 'Grande' },
];

export interface KetoStatus { label: string; color: string }

const NEUTRAL = 'rgba(255,255,255,0.5)';
const LIGHT = '#a8e02a';
const OPTIMAL = '#22d3ee';
const HIGH = '#fbbf24';
const VERY = '#ef4444';

/** Rango de cetosis por sangre (mmol/L) — el estándar clínico. */
export function bloodKetoStatus(value: number): KetoStatus {
  if (value < 0.5)  return { label: 'Sin cetosis', color: NEUTRAL };
  if (value <= 1.5) return { label: 'Cetosis ligera', color: LIGHT };
  if (value <= 3.0) return { label: 'Cetosis óptima', color: OPTIMAL };
  if (value <= 5.0) return { label: 'Cetosis alta', color: HIGH };
  return { label: 'Muy alta', color: VERY };
}

/** Rango aproximado por aliento (acetona ppm). Correlación orientativa. */
export function breathKetoStatus(ppm: number): KetoStatus {
  if (ppm < 2)   return { label: 'Sin cetosis', color: NEUTRAL };
  if (ppm <= 10) return { label: 'Cetosis ligera', color: LIGHT };
  if (ppm <= 40) return { label: 'Cetosis óptima', color: OPTIMAL };
  return { label: 'Cetosis alta', color: HIGH };
}

/** Estado por nivel cualitativo de orina. */
export function urineKetoStatus(levelId: string): KetoStatus {
  switch (levelId) {
    case 'negative': return { label: 'Negativo', color: NEUTRAL };
    case 'trace':    return { label: 'Trazas', color: LIGHT };
    case 'small':    return { label: 'Pequeña', color: LIGHT };
    case 'moderate': return { label: 'Moderada', color: OPTIMAL };
    case 'large':    return { label: 'Grande', color: HIGH };
    default:         return { label: '—', color: NEUTRAL };
  }
}

export interface KetoneReadingInput {
  source: KetoneSource;
  /** Valor numérico para sangre (mmol/L) o aliento (ppm). */
  numeric?: number | null;
  /** Nivel cualitativo para orina. */
  urineLevel?: string | null;
}

/** ¿La lectura es válida para guardar? (rangos sanos por fuente). */
export function isValidKetoneReading(input: KetoneReadingInput): boolean {
  if (input.source === 'urine') {
    return URINE_LEVELS.some((l) => l.id === input.urineLevel);
  }
  const v = input.numeric;
  if (v == null || !Number.isFinite(v) || v < 0) return false;
  if (input.source === 'blood') return v <= 10;   // mmol/L plausible
  return v <= 200;                                 // ppm plausible
}

/** Estado (label + color) de una lectura ya guardada, según su fuente. */
export function ketoStatusFor(input: KetoneReadingInput): KetoStatus {
  if (input.source === 'urine') return urineKetoStatus(input.urineLevel ?? '');
  if (input.source === 'breath') return breathKetoStatus(input.numeric ?? 0);
  return bloodKetoStatus(input.numeric ?? 0);
}

/** Texto de la lectura para el historial ("1.5 mmol/L", "12 ppm", "Moderada"). */
export function formatKetoneReading(input: KetoneReadingInput): string {
  if (input.source === 'urine') {
    return URINE_LEVELS.find((l) => l.id === input.urineLevel)?.name ?? '—';
  }
  const unit = input.source === 'blood' ? 'mmol/L' : 'ppm';
  const v = input.numeric ?? 0;
  return `${input.source === 'blood' ? v.toFixed(1) : v.toFixed(0)} ${unit}`;
}
