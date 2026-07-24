/**
 * Journal — tipos de práctica, FUENTE ÚNICA (V1.5 · 3.3).
 *
 * Antes vivían duplicados: JOURNAL_TYPES en app/journal.tsx (CATEGORY_COLORS)
 * y TYPE_META hardcodeado en app/journal-history.tsx — el hex podía driftear
 * en silencio. Aquí ambos derivan de CATEGORY_COLORS.
 */
import type { Ionicons } from '@expo/vector-icons';
import { CATEGORY_COLORS } from './brand';

export interface JournalType {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

export const JOURNAL_TYPES: readonly JournalType[] = [
  { key: 'gratitude', label: 'Gratitud', icon: 'heart-outline', color: CATEGORY_COLORS.cycle, description: '9 preguntas de agradecimiento' },
  { key: 'vision', label: 'Visión', icon: 'telescope-outline', color: CATEGORY_COLORS.metrics, description: 'Tu futuro en 1, 3 y 5 años' },
  { key: 'stoic', label: 'Estoico', icon: 'library-outline', color: CATEGORY_COLORS.mind, description: 'Reflexión al estilo Séneca' },
  { key: 'work_dump', label: 'Descarga', icon: 'briefcase-outline', color: CATEGORY_COLORS.optimization, description: 'Vacía pendientes de tu cabeza' },
] as const;

/** Lookup por key con fallback 'free' (entradas legacy / mini-entradas del check-in). */
export const JOURNAL_TYPE_META: Record<string, { label: string; color: string }> = {
  free: { label: 'Libre', color: '#8a8a8a' },
  ...Object.fromEntries(JOURNAL_TYPES.map(t => [t.key, { label: t.label, color: t.color }])),
};
