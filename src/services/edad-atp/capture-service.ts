/**
 * Capture service — persistencia de los datos de captura manual (Sprint 2).
 * Funciones puras de escritura a las tablas edad_atp_* (testeables con mock).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';

export type SaveResult = { ok: boolean; error?: string };

export type BiomarkerEntry = { key: string; value: number; unit: string };

/** Inserta una fila por biomarcador (source 'manual', measured_at now). */
export async function saveBiomarkers(userId: string, entries: BiomarkerEntry[]): Promise<SaveResult> {
  const rows = entries.map((e) => ({
    user_id: userId,
    biomarker_key: e.key,
    value: e.value,
    unit: e.unit,
    source: 'manual',
    measured_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('edad_atp_biomarkers').insert(rows);
  if (error) {
    logWarn('[edad-atp capture] saveBiomarkers failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
