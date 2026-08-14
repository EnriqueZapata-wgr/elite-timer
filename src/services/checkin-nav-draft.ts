/**
 * Borrador del paso NAVEGAR del check-in (OLA5 pieza 2).
 *
 * El re-check-in de vuelta de la herramienta ("¿cómo quedaste?") es la única
 * métrica de eficacia que tenemos: sin ese segundo dato no sabemos si moverse
 * sirve. Mientras la pantalla siga montada, el ref en memoria basta — al volver
 * de /breathing o /meditation el useFocusEffect la reencuentra viva. Este
 * borrador cubre el caso feo: que el sistema mate el proceso mientras la
 * persona respira. Al reabrir el check-in, la pregunta sigue esperando.
 *
 * Solo se escribe al salir hacia una herramienta, y se borra en cuanto la
 * persona contesta o dice que prefiere no decir. La regla con filo (ventana y
 * validación) vive pura en checkin-nav-draft-core.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { warn as logWarn } from '@/src/lib/logger';
import { parseNavDraft, type NavDraft } from '@/src/services/checkin-nav-draft-core';

export { NAV_DRAFT_TTL_MS, isNavDraftFresh, parseNavDraft } from '@/src/services/checkin-nav-draft-core';
export type { NavDraft } from '@/src/services/checkin-nav-draft-core';

const KEY = 'atp.checkin.nav_draft.v1';

export async function saveNavDraft(draft: Omit<NavDraft, 'savedAt'>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch (e) {
    // Best-effort: el ref en memoria ya cubre el caso normal.
    logWarn('[checkin-nav-draft] save failed', e);
  }
}

export async function readNavDraft(nowMs: number = Date.now()): Promise<NavDraft | null> {
  try {
    return parseNavDraft(await AsyncStorage.getItem(KEY), nowMs);
  } catch {
    return null;
  }
}

export async function clearNavDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch { /* si no se pudo borrar, el TTL lo entierra */ }
}
