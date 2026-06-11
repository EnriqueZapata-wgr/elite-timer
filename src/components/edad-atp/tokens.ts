/**
 * Tokens compartidos del módulo Edad ATP — colores por dimensión, estados,
 * timings de animación y helpers de status. Fuente única para los componentes UI.
 */
import { Colors } from '@/constants/theme';

// Motor v2: 5 áreas (labs/composicion/fitness/cognicion/riesgos). Emojis sin cambio.
export type DimKey = 'labs' | 'composicion' | 'fitness' | 'cognicion' | 'riesgos';

export const EDAD_DIMS: { key: DimKey; icon: string; label: string; color: string }[] = [
  { key: 'labs', icon: '🩸', label: 'Labs', color: '#E24B4A' },
  { key: 'composicion', icon: '💪', label: 'Composición', color: '#a8e02a' },
  { key: 'fitness', icon: '🏃', label: 'Fitness', color: '#EF9F27' },
  { key: 'cognicion', icon: '🧠', label: 'Cognición', color: '#7F77DD' },
  { key: 'riesgos', icon: '❤️', label: 'Riesgos', color: '#E24B4A' },
];

export const EDAD_STATUS = { good: Colors.neonGreen, neutral: '#EF9F27', bad: '#E24B4A' };

/**
 * CE mínimo (%) para mostrar el número de una sub-edad. Por debajo, la mayoría de
 * sus params no están contestados y el número (calculado con lo poco presente)
 * asusta sin causa real → se muestra "Pendiente". Default 50 (flag #3 del handoff).
 */
export const SUB_EDAD_CE_PENDING_THRESHOLD = 50;

/** Color del estado pendiente (gris, con ⚠️ ámbar como indicador). */
export const EDAD_PENDING_COLOR = '#8E8E93';

/**
 * Color por estado de una sub-edad vs cronológica. Regla única (sprint captura
 * unificada): edad < cron−1 → verde · dentro de ±1 → neutro · > cron+1 → rojo.
 * Aplica a TODAS las sub-edades y la constelación.
 */
export function statusColor(sub: number, chrono: number): string {
  const d = sub - chrono;
  if (d <= -1) return EDAD_STATUS.good;
  if (d >= 1) return EDAD_STATUS.bad;
  return EDAD_STATUS.neutral;
}

/** Glifo de estado (▲ mejor / ◐ neutro / ▼ peor). Mismos umbrales que statusColor. */
export function statusGlyph(sub: number, chrono: number): string {
  const d = sub - chrono;
  if (d <= -1) return '▲';
  if (d >= 1) return '▼';
  return '◐';
}

/**
 * Banda de un componente del motor v2 a partir de su score normalizado 0-100.
 * ≥80 óptimo · ≥50 aceptable · <50 atención · null pendiente.
 * "capturado" = dato presente sin score 0-100 (PhenoAge core: alimenta la fórmula
 * directamente, no se banda individualmente). PROHIBIDO el label ambiguo "bajo".
 */
export type ComponentBand = 'optimo' | 'aceptable' | 'atencion' | 'pendiente' | 'capturado';

export const BAND_DISPLAY: Record<ComponentBand, { glyph: string; color: string }> = {
  optimo: { glyph: '▲ óptimo', color: EDAD_STATUS.good },
  aceptable: { glyph: '◐ aceptable', color: EDAD_STATUS.neutral },
  atencion: { glyph: '● atención', color: EDAD_STATUS.bad },
  pendiente: { glyph: 'ⓘ pendiente', color: EDAD_PENDING_COLOR },
  capturado: { glyph: '✓ capturado', color: '#7FA65A' },
};

/** Timings de animación (ms). */
export const EDAD_TIMING = {
  staggerMs: 80,
  constellationBaseDelay: 250,
  cinematicReveal: 1800,
  countUpStep: 35,
};
