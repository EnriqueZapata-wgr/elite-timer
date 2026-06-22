/**
 * challenge-progress-writer — acumula progreso de retos a partir de eventos del día y, si un
 * criterio se cumple, dispara la Edge Function settle-challenge (que re-valida server-side y
 * acredita el premio). Fire-and-forget. NO-OP si LAB_ECONOMY_ENABLED=false (byte-idéntico).
 *
 * La lógica de progreso/criterio es PURA y compartida (supabase/functions/_shared/challenge-criteria).
 */
import { supabase } from '@/src/lib/supabase';
import { LAB_ECONOMY_ENABLED } from './economy-config';
import {
  updateProgress, isCompleted,
  type CriteriaType, type Criteria, type Progress,
} from '../../../supabase/functions/_shared/challenge-criteria';

export interface ProgressEventInput {
  userId: string;
  type: CriteriaType;
  value: number;
  date: string; // YYYY-MM-DD local
  metadata?: Record<string, any>;
}

export async function writeChallengeProgress(event: ProgressEventInput): Promise<void> {
  if (!LAB_ECONOMY_ENABLED) return;
  try {
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('id, challenge_id, progress, challenges(criteria)')
      .eq('user_id', event.userId)
      .eq('status', 'active');

    for (const p of (participants ?? []) as any[]) {
      const criteria = (p.challenges?.criteria ?? null) as Criteria | null;
      if (!criteria || criteria.type !== event.type) continue;

      const newProgress: Progress = updateProgress(criteria, p.progress, {
        type: event.type, value: event.value, date: event.date,
      });

      await supabase.from('challenge_participants').update({ progress: newProgress }).eq('id', p.id);

      if (isCompleted(criteria, newProgress)) {
        // Settle server-side (re-valida + acredita premio; idempotente).
        await supabase.functions.invoke('settle-challenge', { body: { participant_id: p.id } });
      }
    }
  } catch (e: any) {
    console.warn('[economy] writeChallengeProgress failed', e?.message ?? e);
  }
}

/** Fire-and-forget para call-sites. */
export function fireChallengeProgress(event: ProgressEventInput): void {
  void writeChallengeProgress(event);
}
