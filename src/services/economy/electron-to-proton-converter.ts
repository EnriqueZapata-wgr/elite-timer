/**
 * electron-to-proton-converter — conversión E- → H+.
 *
 * La conversión REAL la hace la RPC `convert_electrons_to_protons` (091): atómica y con la
 * TASA calculada en el servidor (el cliente NO puede inflarla). Aquí solo exponemos:
 *   - getConversionRate(): preview de la tasa actual (base × multiplier de reto activo),
 *   - convertElectronsToProtons(): dispara la RPC.
 */
import { supabase } from '@/src/lib/supabase';
import { BASE_CONVERSION, BASE_PROTONS_PER_ELECTRON } from './economy-config';
import { getLocalToday } from '@/src/utils/date-helpers';

export { BASE_CONVERSION } from './economy-config';

/** Preview de la tasa. Lee el multiplier del reto activo (igual criterio que la RPC). */
export async function getConversionRate(
  userId: string,
): Promise<{ electronsRate: number; protonsRate: number; multiplier: number }> {
  let multiplier = 1.0;
  const today = getLocalToday();
  const { data } = await supabase
    .from('challenge_participants')
    .select('status, challenges!inner(electron_multiplier, active, start_date, end_date)')
    .eq('user_id', userId)
    .eq('status', 'active');
  for (const row of (data ?? []) as any[]) {
    const c = row.challenges;
    if (c?.active && c.start_date <= today && today <= c.end_date) {
      multiplier = Math.max(multiplier, Number(c.electron_multiplier) || 1.0);
    }
  }
  return {
    electronsRate: BASE_CONVERSION.electrons,
    protonsRate: Math.round(BASE_CONVERSION.protons * multiplier),
    multiplier,
  };
}

/** Cantidad de H+ que recibirá por X electrones (preview UI; múltiplos de 100). */
export function previewProtons(electrons: number, multiplier = 1.0): number {
  return Math.round(electrons * BASE_PROTONS_PER_ELECTRON * multiplier);
}

export async function convertElectronsToProtons(
  userId: string,
  electrons: number,
): Promise<{ success: boolean; protonsGained: number; multiplier?: number; error?: string }> {
  const { data, error } = await supabase.rpc('convert_electrons_to_protons', {
    p_user_id: userId,
    p_electrons: electrons,
  });
  if (error) return { success: false, protonsGained: 0, error: error.message };
  const r = (data ?? {}) as { success?: boolean; protons_gained?: number; multiplier?: number; error?: string };
  return { success: !!r.success, protonsGained: r.protons_gained ?? 0, multiplier: r.multiplier, error: r.error };
}
