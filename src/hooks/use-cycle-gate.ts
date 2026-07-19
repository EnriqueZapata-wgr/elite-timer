/**
 * useCycleGate — guard de las pantallas del pilar Ciclo (MB-7).
 *
 * Lee biological_sex de client_profiles y, si no es 'female', saca al usuario
 * de la pantalla (router.back). Cierra el hueco de deep-link: /cycle*,
 * /cycle-charts, /cycle-history, /cycle-settings ya no renderizan contenido de
 * ciclo a un hombre aunque llegue por URL directa.
 *
 * Estados: 'checking' (mientras carga — la pantalla muestra loader), 'allowed'
 * (female → render normal), 'blocked' (no-female → ya se disparó el back).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { canAccessCycle } from '@/src/services/cycle/cycle-access-core';

export type CycleGateState = 'checking' | 'allowed' | 'blocked';

export function useCycleGate(): CycleGateState {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<CycleGateState>('checking');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) { setState('checking'); return; }
      try {
        const { data } = await supabase
          .from('client_profiles').select('biological_sex')
          .eq('user_id', user.id).maybeSingle();
        if (!active) return;
        if (canAccessCycle((data as any)?.biological_sex)) {
          setState('allowed');
        } else {
          setState('blocked');
          // Sacar de la pantalla — nunca renderizar contenido de ciclo.
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }
      } catch {
        // Fail-safe: ante error de lectura, NO mostrar contenido de ciclo.
        if (!active) return;
        setState('blocked');
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    })();
    return () => { active = false; };
  }, [user?.id, router]);

  return state;
}
