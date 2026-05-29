/**
 * useMacroMode — Preferencia "Modo Macro" (PRD §6.6).
 *
 * Default OFF: la UI de nutrición muestra solo score de calidad + proteína.
 * ON: macros completos (kcal, carbs, grasa) como antes.
 *
 * Persiste en client_profiles.macro_mode (DB, sincroniza entre dispositivos).
 * Si la columna aún no existe (migración pendiente), degrada a OFF sin romper.
 * Cambios se propagan via DeviceEventEmitter para que todas las pantallas
 * abiertas reaccionen.
 */
import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';

export const MACRO_MODE_EVENT = 'macro_mode_changed';

export function useMacroMode() {
  const { user } = useAuth();
  const [macroMode, setMacroModeState] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('macro_mode')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) setMacroModeState(!!(data as any).macro_mode);
    } catch { /* columna puede no existir aún — default OFF */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(MACRO_MODE_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const setMacroMode = useCallback(async (value: boolean) => {
    setMacroModeState(value);
    if (user?.id) {
      try {
        await supabase.from('client_profiles').update({ macro_mode: value }).eq('user_id', user.id);
      } catch { /* columna puede no existir — el toggle no persistirá hasta correr la migración */ }
    }
    DeviceEventEmitter.emit(MACRO_MODE_EVENT);
  }, [user?.id]);

  return { macroMode, setMacroMode, loading };
}
