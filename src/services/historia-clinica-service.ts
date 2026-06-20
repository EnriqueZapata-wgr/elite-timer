/**
 * historia-clinica-service — persistencia de los cuestionarios de Historia Clínica (T3/HC5).
 * Una fila por usuario en `historia_clinica` (migración 079); `data` JSONB keyed por categoría.
 * Guardado por categoría con merge (no pisa otras categorías).
 */
import { supabase } from '@/src/lib/supabase';
import type { TestAnswers } from '@/src/components/tests/test-question-types';
import type { HistoriaClinicaData } from '@/src/services/historia-clinica-helpers';

export { type HistoriaClinicaData, completedCategories } from '@/src/services/historia-clinica-helpers';

/** Carga el JSONB completo de historia clínica del usuario ({} si no existe). */
export async function loadHistoriaClinica(userId: string): Promise<HistoriaClinicaData> {
  const { data } = await supabase
    .from('historia_clinica')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.data as HistoriaClinicaData) ?? {};
}

/**
 * Guarda las respuestas de UNA categoría haciendo merge con lo existente (no pisa el resto).
 * Upsert por user_id (UNIQUE). Lee-modifica-escribe; suficiente para el volumen esperado.
 */
export async function saveHistoriaClinicaCategory(
  userId: string,
  category: string,
  answers: TestAnswers,
): Promise<void> {
  const current = await loadHistoriaClinica(userId);
  const merged: HistoriaClinicaData = { ...current, [category]: answers };
  const { error } = await supabase
    .from('historia_clinica')
    .upsert(
      { user_id: userId, data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(error.message || JSON.stringify(error));
}
