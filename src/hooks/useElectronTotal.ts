/**
 * useElectronTotal — Hook para obtener el total acumulado de electrones.
 *
 * Lee de electron_logs al montar y cuando recibe 'electrons_changed'
 * via DeviceEventEmitter. Expone refresh() para uso manual.
 */
import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export function useElectronTotal() {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('electron_logs')
        .select('electrons')
        .eq('user_id', user.id);
      const sum = (data ?? []).reduce((acc: number, row: any) => acc + Number(row.electrons), 0);
      setTotal(Math.round(sum * 10) / 10);
    } catch { /* silenciar */ }
  }, []);

  useEffect(() => {
    refresh();
    const sub = DeviceEventEmitter.addListener('electrons_changed', refresh);
    return () => sub.remove();
  }, [refresh]);

  return { total, refresh };
}
