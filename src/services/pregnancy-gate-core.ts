/**
 * Gate puro de la máscara embarazo/lactancia (#4 P0 clínico).
 *
 * El embarazo solo puede activarse para `biological_sex === 'female'`. Un dato
 * residual/seed en `cycle_settings.pregnancy_status` o `client_profiles.cycle_modality`
 * NUNCA activa la máscara para un usuario male/null/undefined.
 */
export interface PregnancyGateInput {
  /** `client_profiles.biological_sex` — 'female' | 'male' | null/undefined. */
  biologicalSex?: string | null;
  /** `cycle_settings.pregnancy_status` JSONB (migración 080). */
  pregnancyStatus?: unknown;
  /** `client_profiles.cycle_modality` (onboarding v2). */
  cycleModality?: string | null;
}

export function resolvePregnancyActive(input: PregnancyGateInput): boolean {
  if (input.biologicalSex !== 'female') return false;
  const status = input.pregnancyStatus as { is_pregnant?: unknown } | null | undefined;
  if (status && typeof status === 'object' && status.is_pregnant === true) return true;
  return input.cycleModality === 'pregnancy';
}
