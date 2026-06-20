/**
 * Helpers puros de historia clínica (sin imports de supabase/RN) → testeables en vitest.
 */
import type { TestAnswers } from '@/src/components/tests/test-question-types';

export type HistoriaClinicaData = Record<string, TestAnswers>;

/** Set de categorías ya respondidas (para marcar "completado" en el índice). */
export function completedCategories(data: HistoriaClinicaData): Set<string> {
  return new Set(Object.keys(data).filter(k => data[k] && Object.keys(data[k]).length > 0));
}
