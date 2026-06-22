/**
 * requestElectronAward — pide al servidor (Edge Function award-electrons) acreditar E- por un
 * hábito. El cliente NUNCA acredita directo (RLS SELECT-only). FIRE-AND-FORGET: nunca bloquea
 * la UI ni hace rollback del hábito si falla.
 *
 * Flag OFF (default) → NO-OP silencioso: ni red, ni evento, ni logs ruidosos → byte-idéntico
 * al comportamiento actual.
 */
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { LAB_ECONOMY_ENABLED } from './economy-config';
import type { EvidenceTier } from '../../../supabase/functions/_shared/award-rules';

export interface AwardRequest {
  habit_type: string;
  evidence_tier: EvidenceTier;
  /** ej. `${habit_type}_${userId}_${localDate}` o `..._${index}` / `..._${eventId}`. */
  idempotency_key: string;
  local_date?: string;
  metadata?: Record<string, any>;
}

export interface AwardResult {
  success: boolean;
  electrons_awarded: number;
  new_balance?: number;
  new_rank?: number;
  reason?: string;
}

export async function requestElectronAward(params: AwardRequest): Promise<AwardResult> {
  if (!LAB_ECONOMY_ENABLED) {
    return { success: false, electrons_awarded: 0, reason: 'feature_disabled' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('award-electrons', { body: params });
    if (error) {
      console.warn('[economy] award-electrons failed', error?.message ?? error);
      return { success: false, electrons_awarded: 0, reason: 'network_error' };
    }
    const r = (data ?? {}) as AwardResult;
    if (r.success && (r.electrons_awarded ?? 0) > 0) {
      DeviceEventEmitter.emit('balance_changed');
    }
    return r;
  } catch (e: any) {
    console.warn('[economy] award-electrons exception', e?.message ?? e);
    return { success: false, electrons_awarded: 0, reason: 'network_error' };
  }
}

/** Dispara el award sin esperar (helper explícito fire-and-forget para call-sites). */
export function fireElectronAward(params: AwardRequest): void {
  void requestElectronAward(params);
}
