/**
 * Tipos para el sistema de ejercicios, logging de sets y Personal Records.
 *
 * Estos tipos reflejan las tablas exercises, exercise_logs y personal_records
 * en Supabase.
 */

/** Ejercicio de la biblioteca (público o custom del usuario) */
export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  equipment: string;
  description: string;
  is_public: boolean;
  creator_id: string | null;
}

/** Registro de un set de ejercicio durante o fuera de una ejecución */
export interface ExerciseLog {
  id: string;
  exercise_id: string;
  exercise_name?: string; // joined desde exercises
  set_number: number;
  reps: number;
  weight_kg: number | null;
  rpe: number | null;
  notes: string;
  logged_at: string;
  execution_log_id?: string | null;
  block_id?: string | null;
}

/** Record personal del usuario para un ejercicio + rango de reps */
export interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name?: string; // joined desde exercises
  muscle_group?: string;  // joined desde exercises
  rep_range: number;
  weight_kg: number;
  estimated_1rm: number;
  achieved_at: string;
}

/** Filtros para buscar ejercicios */
export interface ExerciseFilters {
  muscle_group?: string;
  category?: string;
  search?: string;
}

/** Filtros para buscar PRs */
export interface PRFilters {
  muscle_group?: string;
  exercise_id?: string;
}

/** Datos para registrar un set */
export interface LogSetData {
  exercise_id: string;
  reps: number;
  weight_kg?: number | null;
  rpe?: number | null;
  execution_log_id?: string | null;
  block_id?: string | null;
  set_number: number;
  notes?: string;
}

/** Resumen de ejercicio para la pantalla post-rutina */
export interface ExerciseSummary {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  total_reps: number;
  max_weight: number | null;
  total_volume: number | null; // reps × peso
  logs: ExerciseLog[];
  new_pr: boolean;
}

/** Grupos musculares disponibles */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'core',
  'full_body',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

/** Labels en español para grupos musculares */
export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  legs: 'Piernas',
  arms: 'Brazos',
  core: 'Core',
  full_body: 'Full Body',
};

/** Colores por grupo muscular */
export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: '#E06666',
  back: '#5B9BD5',
  shoulders: '#EF9F27',
  legs: '#a8e02a',
  arms: '#9B59B6',
  core: '#F1C232',
  full_body: '#1ABC9C',
};
