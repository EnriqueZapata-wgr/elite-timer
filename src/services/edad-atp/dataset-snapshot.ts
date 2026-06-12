/**
 * Snapshot del set de datos integrados que alimentan la Edad ATP, como entradas hasheables.
 * Solo LECTURA (no toca el motor ni lab-values-service). Lo usa el gating de recálculo (#15)
 * y el badge de datos nuevos (#16): si el snapshot no cambió → no recalcular.
 */
import { loadCanonicalLabValues } from './lab-values-service';
import { loadUserData } from './edad-atp-v2-service';
import type { DatasetEntry } from './dataset-hash';

/** Campos no-lab de UnifiedUserData que también alimentan el cálculo (sin fecha por-valor). */
const NONLAB_FIELDS = [
  'chronological_age', 'weight_kg', 'height_cm', 'body_fat_pct', 'skeletal_muscle_pct',
  'visceral_fat', 'grip_strength_kg', 'waist_cm', 'systolic_bp_mmHg', 'diastolic_bp_mmHg',
  'resting_hr_bpm', 'vo2max_ml_kg_min', 'push_ups_max', 'reaction_time_simple_ms', 'reaction_time_choice_ms',
] as const;

/**
 * Construye las entradas hasheables del usuario: labs canónicos (con su fecha de medición) +
 * campos no-lab + scores por dominio. La fecha por-valor hace que un mismo número en distinta
 * fecha cuente como cambio (amerita recalcular).
 */
export async function loadDatasetEntries(userId: string): Promise<DatasetEntry[]> {
  const [canon, data] = await Promise.all([loadCanonicalLabValues(userId), loadUserData(userId)]);
  const entries: DatasetEntry[] = [];
  for (const [key, cv] of Object.entries(canon)) {
    entries.push({ key, value: cv.value, measured_at: cv.measured_at });
  }
  for (const f of NONLAB_FIELDS) {
    const v = (data as any)[f];
    if (typeof v === 'number' && Number.isFinite(v)) entries.push({ key: f, value: v });
  }
  for (const [dom, score] of Object.entries(data.sf_scores_by_domain ?? {})) {
    if (typeof score === 'number' && Number.isFinite(score)) entries.push({ key: `dom_${dom}`, value: score });
  }
  return entries;
}
