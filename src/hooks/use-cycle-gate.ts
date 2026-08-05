/**
 * useCycleGate — guard de las pantallas del pilar Ciclo (MB-7, MB-22 P4).
 *
 * Lee biological_sex + el modo de la app (user_app_modes) y decide con
 * canOpenCycleApp: propio (female sin modo o modo propio) y acompañante
 * (cualquier sexo con modo 'acompanante') entran; todo lo demás sale de la
 * pantalla (router.back). Cierra el hueco de deep-link: /cycle*, /cycle-charts,
 * /cycle-history, /cycle-settings no renderizan ciclo a quien no le toca.
 *
 * Devuelve además el MODO para que cada pantalla adapte su copy y esconda lo
 * que es solo de un ciclo propio (embarazo, recomendaciones al cuerpo).
 *
 * Estados: 'checking' (cargando — loader), 'allowed' (render normal),
 * 'blocked' (ya se disparó el back).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { canOpenCycleApp, canAccessCycle, type CycleMode } from '@/src/services/cycle/cycle-access-core';
import { getCycleAppMode } from '@/src/services/app-mode-service';

export type CycleGateState = 'checking' | 'allowed' | 'blocked';

export interface CycleGate {
  state: CycleGateState;
  /**
   * 'propio' | 'acompanante' una vez allowed. Propio incluye a la usuaria
   * sin fila de modo (comportamiento de siempre).
   */
  mode: CycleMode | null;
}

export function useCycleGate(): CycleGate {
  const { user } = useAuth();
  const router = useRouter();
  const [gate, setGate] = useState<CycleGate>({ state: 'checking', mode: null });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) { setGate({ state: 'checking', mode: null }); return; }
      try {
        const [{ data }, mode] = await Promise.all([
          supabase.from('client_profiles').select('biological_sex')
            .eq('user_id', user.id).maybeSingle(),
          getCycleAppMode(user.id),
        ]);
        if (!active) return;
        const sex = (data as any)?.biological_sex;
        if (canOpenCycleApp(sex, mode)) {
          setGate({
            state: 'allowed',
            mode: canAccessCycle(sex, mode) ? 'propio' : 'acompanante',
          });
        } else {
          setGate({ state: 'blocked', mode: null });
          // Sacar de la pantalla — nunca renderizar contenido de ciclo.
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }
      } catch {
        // Fail-safe: ante error de lectura, NO mostrar contenido de ciclo.
        if (!active) return;
        setGate({ state: 'blocked', mode: null });
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    })();
    return () => { active = false; };
  }, [user?.id, router]);

  return gate;
}
