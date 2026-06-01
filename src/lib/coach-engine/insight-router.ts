// Coach Engine — Router de Insights (output dual)
// Brief §11.3 — recibe eventos (DeviceEventEmitter) y genera coach_insights
// para los 2 canales: chat + UI (briefing/post_action/weekly_review/alert).
// TODO (sub-session COACH 6/N): implementar routeEvent() que decida canal +
// persista coach_insights. Recordar emitir DeviceEventEmitter tras escribir.

import type { CoachInsightChannel } from './types';

export interface CoachEvent {
  type: string;
  userId: string;
  payload?: Record<string, unknown>;
}

export async function routeEvent(_event: CoachEvent): Promise<void> {
  // TODO: clasificar canal + generar coach_insights.
  throw new Error('TODO: implement routeEvent');
}

export async function emitInsight(_userId: string, _channel: CoachInsightChannel, _content: string): Promise<void> {
  // TODO: insertar en coach_insights + DeviceEventEmitter para refrescar UI.
  throw new Error('TODO: implement emitInsight');
}
