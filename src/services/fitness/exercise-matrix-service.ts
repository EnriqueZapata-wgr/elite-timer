/**
 * Exercise Matrix service — lectura del catálogo matriceado (tabla
 * `exercise_matrix`, 212 filas). Catálogo estático por sesión: se cachea en
 * memoria tras la primera query (el generador y la biblioteca lo consultan
 * varias veces; una sola ida a red).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { mapMatrixRow, type ExerciseMatrixRow, type MatrixExercise } from '@/src/constants/exercise-matrix';

let cache: MatrixExercise[] | null = null;

/** Catálogo completo (cacheado en memoria). [] si falla la red y no hay cache. */
export async function getExerciseMatrix(): Promise<MatrixExercise[]> {
  if (cache) return cache;
  const { data, error } = await supabase
    .from('exercise_matrix')
    .select('*')
    .order('nombre');
  if (error) {
    logWarn('[exercise-matrix] getExerciseMatrix failed:', error.message);
    return cache ?? [];
  }
  cache = ((data ?? []) as ExerciseMatrixRow[]).map(mapMatrixRow);
  return cache;
}

/** Un ejercicio por slug (usa el cache del catálogo). */
export async function getMatrixExercise(slug: string): Promise<MatrixExercise | null> {
  const all = await getExerciseMatrix();
  return all.find((e) => e.slug === slug) ?? null;
}

/** Invalida el cache (solo para tests / refresh manual). */
export function clearExerciseMatrixCache(): void {
  cache = null;
}
