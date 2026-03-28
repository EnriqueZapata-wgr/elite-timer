/**
 * Categorías de intervención — Fuente única de verdad.
 *
 * 6 categorías oficiales con colores e iconos consistentes.
 * Incluye mapeo de categorías legacy de la DB.
 */
import { CATEGORY_COLORS } from './brand';

export const INTERVENTION_TYPES = {
  fitness: {
    key: 'fitness',
    label: 'Fitness',
    color: CATEGORY_COLORS.fitness,
    icon: 'barbell-outline',
    description: 'Ejercicio, rutinas, caminatas, PRs',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrición',
    color: CATEGORY_COLORS.nutrition,
    icon: 'restaurant-outline',
    description: 'Comida, ayuno, hidratación, macros',
  },
  mind: {
    key: 'mind',
    label: 'Mente',
    color: CATEGORY_COLORS.mind,
    icon: 'sparkles-outline',
    description: 'Meditación, respiración, journaling, enfoque',
  },
  optimization: {
    key: 'optimization',
    label: 'Optimización',
    color: CATEGORY_COLORS.optimization,
    icon: 'flask-outline',
    description: 'Suplementos, hábitos, grounding, biohacks',
  },
  metrics: {
    key: 'metrics',
    label: 'Métricas',
    color: CATEGORY_COLORS.metrics,
    icon: 'analytics-outline',
    description: 'Labs, tallas, wearables, composición corporal',
  },
  rest: {
    key: 'rest',
    label: 'Descanso',
    color: CATEGORY_COLORS.rest,
    icon: 'moon-outline',
    description: 'Sueño, recovery, cold/heat exposure',
  },
} as const;

export type InterventionType = keyof typeof INTERVENTION_TYPES;

/** Obtener color por categoría (con aliases legacy) */
export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    fitness: CATEGORY_COLORS.fitness,
    nutrition: CATEGORY_COLORS.nutrition,
    mind: CATEGORY_COLORS.mind,
    optimization: CATEGORY_COLORS.optimization,
    metrics: CATEGORY_COLORS.metrics,
    rest: CATEGORY_COLORS.rest,
    // Aliases para retrocompatibilidad con datos existentes en DB
    habits: CATEGORY_COLORS.optimization,
    supplements: CATEGORY_COLORS.optimization,
    recovery: CATEGORY_COLORS.rest,
    sleep: CATEGORY_COLORS.rest,
  };
  return map[category] || '#888888';
}

/** Mapeo de categorías legacy a las 6 oficiales */
export function normalizeCategory(category: string): InterventionType {
  const map: Record<string, InterventionType> = {
    fitness: 'fitness',
    nutrition: 'nutrition',
    mind: 'mind',
    optimization: 'optimization',
    metrics: 'metrics',
    rest: 'rest',
    habits: 'optimization',
    supplements: 'optimization',
    recovery: 'rest',
    sleep: 'rest',
  };
  return map[category] || 'fitness';
}

/** Label para mostrar al usuario */
export function getCategoryLabel(category: string): string {
  return INTERVENTION_TYPES[normalizeCategory(category)].label;
}

/** Icono de la categoría */
export function getCategoryIcon(category: string): string {
  return INTERVENTION_TYPES[normalizeCategory(category)].icon;
}
