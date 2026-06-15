/**
 * useFormDraft — persiste el borrador de un formulario de captura en AsyncStorage
 * para que NO se pierda al navegar a otra pantalla y volver (Mariana #11, #15:
 * "meto datos, navego, regreso y ya no están").
 *
 * Uso:
 *   const draft = useFormDraft('composition', user?.id);
 *   // al enfocar: const saved = await draft.load();  → merge sobre lo cargado de DB
 *   // al teclear: draft.save(nextValues);
 *   // al guardar OK: draft.clear();
 *
 * El borrador guarda solo campos NO vacíos. Se limpia al persistir a DB (entonces la
 * recarga desde DB ya trae el valor). Best-effort: cualquier error de storage se ignora.
 */
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const draftKey = (screen: string, userId?: string) => `draft:${screen}:${userId ?? 'anon'}`;

export function useFormDraft(screen: string, userId?: string) {
  const load = useCallback(async (): Promise<Record<string, string> | null> => {
    if (!userId) return null;
    try {
      const raw = await AsyncStorage.getItem(draftKey(screen, userId));
      return raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch { return null; }
  }, [screen, userId]);

  const save = useCallback(async (data: Record<string, string>) => {
    if (!userId) return;
    try {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v != null && String(v).trim() !== ''),
      );
      if (Object.keys(clean).length === 0) {
        await AsyncStorage.removeItem(draftKey(screen, userId));
        return;
      }
      await AsyncStorage.setItem(draftKey(screen, userId), JSON.stringify(clean));
    } catch { /* draft best-effort */ }
  }, [screen, userId]);

  const clear = useCallback(async () => {
    if (!userId) return;
    try { await AsyncStorage.removeItem(draftKey(screen, userId)); } catch { /* */ }
  }, [screen, userId]);

  return { load, save, clear };
}
