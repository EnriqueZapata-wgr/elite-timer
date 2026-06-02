// Coach Engine — Router de Insights (output dual)
// Brief §11.3 — el coach emite eventos a lo largo de su procesamiento; el
// router decide a qué canal va cada uno (chat vs UI: briefing/post_action/
// weekly_review/alert) y los persiste en coach_insights.

import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import type { CoachInsightChannel } from './types';

export interface CoachEvent {
  type: string;
  /** Texto a mostrar (coach_insights.content es NOT NULL). */
  content?: string;
  /** Payload estructurado para la UI (coach_insights.ui_payload). */
  payload?: Record<string, unknown>;
}

/** Mapa tipo-de-evento → canal de salida (§11.3). */
const EVENT_CHANNEL_MAP: Record<string, CoachInsightChannel> = {
  chat_response: 'chat',
  morning_briefing: 'briefing',
  post_action_feedback: 'post_action',
  weekly_summary: 'weekly_review',
  red_flag_alert: 'alert',
};

/**
 * Decide el canal de un evento del coach (§11.3). Default: 'chat'.
 */
export function routeEvent(event: CoachEvent): CoachInsightChannel {
  return EVENT_CHANNEL_MAP[event.type] ?? 'chat';
}

/**
 * Persiste un insight en coach_insights y notifica a la UI (§11.3).
 * Tras escribir, emite DeviceEventEmitter('coach_insight_emitted', { id, channel })
 * para que los listeners de UI lo recojan (regla #5/#6 de CLAUDE.md).
 */
export async function emitInsight(
  userId: string,
  event: CoachEvent,
): Promise<{ id: string; channel: CoachInsightChannel }> {
  const channel = routeEvent(event);
  const content = event.content ?? (event.payload?.content as string | undefined) ?? event.type;

  const { data, error } = await supabase
    .from('coach_insights')
    .insert({
      user_id: userId,
      channel,
      content,
      ui_payload: event.payload ?? null,
      triggered_by: event.type,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`insight-router: emitInsight failed — ${error.message}`);
  }

  const id = (data as { id: string }).id;
  DeviceEventEmitter.emit('coach_insight_emitted', { id, channel });
  return { id, channel };
}

// TEST: routeEvent({ type: 'red_flag_alert' }) === 'alert'
// TEST: routeEvent({ type: 'morning_briefing' }) === 'briefing'
// TEST: routeEvent({ type: 'unknown_type' }) === 'chat' (default)
// INTEGRATION TEST: emitInsight(userId, { type: 'chat_response', content: '...' }) inserta + emite evento
