/**
 * Categorías de intervención — Fuente única de verdad.
 *
 * 6 categorías oficiales con colores e iconos consistentes.
 * Incluye mapeo de categorías legacy de la DB.
 */

export const INTERVENTION_TYPES = {
  fitness: {
    key: 'fitness',
    label: 'Fitness',
    color: '#a8e02a',
    icon: 'barbell-outline',
    description: 'Ejercicio, rutinas, caminatas, PRs',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrición',
    color: '#5B9BD5',
    icon: 'restaurant-outline',
    description: 'Comida, ayuno, hidratación, macros',
  },
  mind: {
    key: 'mind',
    label: 'Mente',
    color: '#7F77DD',
    icon: 'sparkles-outline',
    description: 'Meditación, respiración, journaling, enfoque',
  },
  optimization: {
    key: 'optimization',
    label: 'Optimización',
    color: '#EF9F27',
    icon: 'flask-outline',
    description: 'Suplementos, hábitos, grounding, biohacks',
  },
  metrics: {
    key: 'metrics',
    label: 'Métricas',
    color: '#1D9E75',
    icon: 'analytics-outline',
    description: 'Labs, tallas, wearables, composición corporal',
  },
  rest: {
    key: 'rest',
    label: 'Descanso',
    color: '#E0E0E0',
    icon: 'moon-outline',
    description: 'Sueño, recovery, cold/heat exposure',
  },
} as const;

export type InterventionType = keyof typeof INTERVENTION_TYPES;

/** Obtener color por categoría (con aliases legacy) */
export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    fitness: '#a8e02a',
    nutrition: '#5B9BD5',
    mind: '#7F77DD',
    optimization: '#EF9F27',
    metrics: '#1D9E75',
    rest: '#E0E0E0',
    // Aliases para retrocompatibilidad con datos existentes en DB
    habits: '#EF9F27',
    supplements: '#EF9F27',
    recovery: '#E0E0E0',
    sleep: '#E0E0E0',
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
