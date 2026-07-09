/**
 * useNutritionMode — modo SIMPLE vs COMPLETO del pilar nutrición (#52).
 *
 * Fuente: client_profiles.nutrition_mode (166), con fallback al precursor
 * macro_mode para perfiles pre-migración. Reacciona en vivo a cambios
 * (NUTRITION_MODE_EVENT) desde Settings o cualquier pantalla.
 */
import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { getNutritionMode, setNutritionMode, NUTRITION_MODE_EVENT } from '@/src/services/nutrition-mode-service';
import type { NutritionMode } from '@/src/services/nutrition-mode-core';

export function useNutritionMode() {
  const { user } = useAuth();
  const [mode, setModeState] = useState<NutritionMode>('simple');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setModeState(await getNutritionMode(user.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(NUTRITION_MODE_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const setMode = useCallback(async (next: NutritionMode) => {
    setModeState(next); // optimista — el evento re-sincroniza
    if (user?.id) await setNutritionMode(user.id, next);
  }, [user?.id]);

  return { mode, setMode, loading, isComplete: mode === 'complete' };
}
