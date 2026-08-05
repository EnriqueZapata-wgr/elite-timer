/**
 * ARGOS Conversations — lógica pura del panel (MB-21 Pieza 3).
 *
 * Lo que vuelve usable el historial cuando hay cincuenta conversaciones:
 * agrupar por fecha, buscar por contenido (no solo título), paginar, y
 * derivar un título decente (la mitad se llamaban "hola").
 * Sin supabase ni RN — testeable en node.
 */

export interface ConversationListRow {
  id: string;
  title: string;
  messages: { role: string; content: string }[];
  updated_at: string;
  session_id?: string | null;
}

/** Tamaño de página del panel (antes: tope duro de 50 sin forma de ver más). */
export const CONVERSATIONS_PAGE_SIZE = 30;

/** Mínimo de mensajes para que una conversación "tenga sustancia" (título ARGOS). */
export const TITLE_SUGGESTION_MIN_MESSAGES = 4;

export type ConversationGroupKey = 'hoy' | 'ayer' | 'semana' | 'atras';

export interface ConversationGroup {
  key: ConversationGroupKey;
  label: string;
  rows: ConversationListRow[];
}

const GROUP_LABELS: Record<ConversationGroupKey, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  semana: 'Esta semana',
  atras: 'Más atrás',
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Clasifica una conversación por su updated_at relativo a `nowMs` (local). */
export function groupKeyFor(updatedAtIso: string, nowMs: number): ConversationGroupKey {
  const updated = new Date(updatedAtIso).getTime();
  if (!Number.isFinite(updated)) return 'atras';
  const today = startOfDay(nowMs);
  const DAY = 24 * 60 * 60 * 1000;
  if (updated >= today) return 'hoy';
  if (updated >= today - DAY) return 'ayer';
  if (updated >= today - 7 * DAY) return 'semana';
  return 'atras';
}

/** Agrupa (ya vienen ordenadas por updated_at DESC) preservando el orden. */
export function groupConversations(rows: ConversationListRow[], nowMs: number): ConversationGroup[] {
  const buckets = new Map<ConversationGroupKey, ConversationListRow[]>();
  for (const row of rows) {
    const key = groupKeyFor(row.updated_at, nowMs);
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }
  const order: ConversationGroupKey[] = ['hoy', 'ayer', 'semana', 'atras'];
  return order
    .filter((k) => buckets.has(k))
    .map((k) => ({ key: k, label: GROUP_LABELS[k], rows: buckets.get(k)! }));
}

/** Normaliza para búsqueda: minúsculas y sin acentos ("glucosa" pega "Glucosa"). */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Busca por CONTENIDO, no solo por título: el título de la mitad de las
 * conversaciones es "hola". Query vacía devuelve todo.
 */
export function filterConversations(rows: ConversationListRow[], query: string): ConversationListRow[] {
  const q = normalize(query.trim());
  if (!q) return rows;
  return rows.filter((row) => {
    if (normalize(row.title ?? '').includes(q)) return true;
    return (row.messages ?? []).some((m) => typeof m?.content === 'string' && normalize(m.content).includes(q));
  });
}

/** ¿La página que llegó estaba llena? (entonces puede haber más). */
export function hasMorePages(lastPageSize: number, pageSize: number = CONVERSATIONS_PAGE_SIZE): boolean {
  return lastPageSize >= pageSize;
}

/** ¿La conversación tiene sustancia para pedirle un título a ARGOS? */
export function hasTitleSubstance(messageCount: number): boolean {
  return messageCount >= TITLE_SUGGESTION_MIN_MESSAGES;
}

/** Valida un título editado a mano: no vacío, sin saltos, con tope razonable. */
export function sanitizeTitle(raw: string): string | null {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.slice(0, 80);
}
