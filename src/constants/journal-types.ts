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

/**
 * Lookup por key con fallback 'free' (entradas legacy).
 *
 * `checkin` NO está en JOURNAL_TYPES a propósito: no es una quinta card del
 * selector, porque esas entradas no se escriben desde aquí. Las crea el
 * check-in emocional cuando dejas nota (`journal_type: 'checkin'`), y aterrizan
 * en este historial.
 *
 * Está aquí porque la lista y los chips de filtro del reporte salen de este
 * objeto: sin su renglón, las notas del check-in se pintaban como "Libre" y no
 * había forma de filtrarlas. Quedaban dentro del journal, sin nombre y sin
 * puerta, que es justo lo que hacía sentir que el journal esconde cosas.
 */
export const JOURNAL_TYPE_META: Record<string, { label: string; color: string }> = {
  free: { label: 'Libre', color: '#8a8a8a' },
  ...Object.fromEntries(JOURNAL_TYPES.map(t => [t.key, { label: t.label, color: t.color }])),
  // Mismo acento que el dominio Emociones de reportes: es de dónde vienen.
  checkin: { label: 'Check-in', color: '#818cf8' },
};
