/**
 * Borrador del paso NAVEGAR — la parte que se puede probar (OLA5 pieza 2).
 *
 * Pura a propósito: cero AsyncStorage, cero React Native. Aquí vive la única
 * regla con filo — que un borrador viejo o corrupto NUNCA secuestre un
 * check-in nuevo. El envoltorio con I/O vive en checkin-nav-draft.ts.
 */

/** Ventana de rescate. Más allá de esto, el viaje ya no es el mismo momento. */
export const NAV_DRAFT_TTL_MS = 30 * 60 * 1000;

export type NavDraft = {
  /** La emoción de origen del check-in que abrió el paso. */
  emotionId: string;
  /** La cadena del movimiento tomado — son las opciones del re-check-in. */
  chainIds: string[];
  /** Epoch ms de cuando la persona salió hacia la herramienta. */
  savedAt: number;
};

/** ¿El borrador sigue en ventana? */
export function isNavDraftFresh(
  draft: Pick<NavDraft, 'savedAt'>,
  nowMs: number,
  ttlMs: number = NAV_DRAFT_TTL_MS,
): boolean {
  const age = nowMs - draft.savedAt;
  // Un reloj que se movió hacia atrás no invalida el borrador: age negativo
  // significa "recién guardado" desde el punto de vista de la persona.
  return age < ttlMs && age > -ttlMs;
}

/** Qué sale de este payload crudo. null si no es utilizable. */
export function parseNavDraft(raw: string | null, nowMs: number): NavDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<NavDraft> | null;
    if (typeof d?.emotionId !== 'string' || !d.emotionId) return null;
    if (!Array.isArray(d.chainIds) || d.chainIds.some(id => typeof id !== 'string')) return null;
    if (typeof d.savedAt !== 'number' || !Number.isFinite(d.savedAt)) return null;
    const draft: NavDraft = { emotionId: d.emotionId, chainIds: d.chainIds, savedAt: d.savedAt };
    return isNavDraftFresh(draft, nowMs) ? draft : null;
  } catch {
    return null;
  }
}
