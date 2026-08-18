/**
 * ARGOS History Window — techo explícito de la ventana de contexto (MB-21 P6).
 *
 * Antes el historial COMPLETO viajaba al modelo en cada turno, sin truncar ni
 * resumir: una conversación larga se pagaba entera, cada vez. Con sesiones
 * (P2) las conversaciones se acotan solas — esta es la otra mitad: los
 * últimos N turnos viajan completos y, si hay más, lo anterior viaja como un
 * resumen barato en el system prompt.
 *
 * El recorte no debe sentirse como que ARGOS "se le olvidó" de golpe: el
 * resumen le dice al modelo qué temas hubo y le ordena pedir el dato en vez
 * de inventarlo, y le permite decir que resumió.
 *
 * Módulo puro (sin supabase, sin RN) — testeable en node.
 */

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Techo de turnos completos que viajan al modelo (~12 pares pregunta-
 * respuesta). Por encima de esto, lo viejo se comprime en el resumen.
 */
export const ARGOS_HISTORY_MAX_TURNS = 24;

/** Máximo de temas citados en el resumen (los más recientes de lo viejo). */
export const ARGOS_HISTORY_SUMMARY_MAX_TOPICS = 6;

/** Largo máximo de cada tema citado en el resumen. */
export const ARGOS_HISTORY_SUMMARY_SNIPPET_LEN = 90;

export interface HistoryWindow<T extends HistoryMessage> {
  /** Los turnos que viajan completos (empiezan siempre en turno de usuario). */
  messages: T[];
  /** true si hubo recorte (el resumen viaja en el system prompt). */
  truncated: boolean;
  /** Bloque para el system prompt. '' cuando no hubo recorte. */
  summaryInjection: string;
}

function snippet(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= ARGOS_HISTORY_SUMMARY_SNIPPET_LEN) return oneLine;
  return oneLine.slice(0, ARGOS_HISTORY_SUMMARY_SNIPPET_LEN).trimEnd() + '…';
}

function buildSummaryInjection(older: HistoryMessage[]): string {
  const userTopics = older
    .filter((m) => m.role === 'user' && m.content.trim().length > 0)
    .slice(-ARGOS_HISTORY_SUMMARY_MAX_TOPICS)
    .map((m) => `«${snippet(m.content)}»`);
  const topicsLine = userTopics.length > 0
    ? `Temas que el usuario trató en esa parte: ${userTopics.join(', ')}.`
    : 'No hay preguntas del usuario en esa parte.';
  // VOZ-4: la última línea decía "puedes mencionar el resumen si viene al caso",
  // que es una invitación abierta a sacar temas viejos. Sumada a la capa de
  // presencia, de ahí salían aperturas como "antes de ir a tu ayuno, van tus
  // labs". El resumen es una RED contra inventar, no material de conversación.
  return `\n\n## CONVERSACIÓN PREVIA (RESUMIDA)\nEsta conversación tiene ${older.length} turnos anteriores que ya no viajan completos. ${topicsLine}\nEsto es una red, no material de conversación: si el usuario refiere algo de esa parte y no lo ves en los mensajes, NO lo inventes, dile con naturalidad que resumiste lo anterior y pídele el dato. NO saques estos temas por tu cuenta ni los uses para abrir la respuesta.`;
}

/**
 * Aplica el techo: últimos ARGOS_HISTORY_MAX_TURNS turnos completos + resumen
 * de lo anterior. La ventana nunca arranca en turno de assistant (la API
 * exige empezar en user): los assistant sueltos del corte pasan al resumen.
 */
export function buildHistoryWindow<T extends HistoryMessage>(messages: T[]): HistoryWindow<T> {
  if (messages.length <= ARGOS_HISTORY_MAX_TURNS) {
    return { messages, truncated: false, summaryInjection: '' };
  }
  let cut = messages.length - ARGOS_HISTORY_MAX_TURNS;
  while (cut < messages.length && messages[cut].role !== 'user') cut++;
  const older = messages.slice(0, cut);
  const window = messages.slice(cut);
  return {
    messages: window,
    truncated: true,
    summaryInjection: buildSummaryInjection(older),
  };
}
