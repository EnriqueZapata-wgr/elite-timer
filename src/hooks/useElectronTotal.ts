/**
 * useElectronTotal — Hook para obtener el total acumulado de electrones.
 *
 * Lee de electron_logs al montar. Expone refresh() para re-leer después
 * de otorgar/revocar.
 */
import { useState, useEffect, useCallback } from 'react';
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
      setTotal(Math.floor(sum));
    } catch { /* silenciar */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { total, refresh };
}
