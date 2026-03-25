/**
 * useCoachStatus — Detecta si el usuario actual es coach.
 *
 * Cachea el resultado a nivel de módulo para evitar re-consultas.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface CoachStatus {
  isCoach: boolean;
  clientCount: number;
  coachCode: string | null;
  loading: boolean;
}

const DEFAULT: CoachStatus = { isCoach: false, clientCount: 0, coachCode: null, loading: true };

let cachedStatus: Omit<CoachStatus, 'loading'> | null = null;
let fetchPromise: Promise<Omit<CoachStatus, 'loading'>> | null = null;

async function fetchCoachStatus(): Promise<Omit<CoachStatus, 'loading'>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isCoach: false, clientCount: 0, coachCode: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_code')
    .eq('id', user.id)
    .single();

  const { count } = await supabase
    .from('coach_clients')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', user.id)
    .eq('status', 'active');

  const coachCode = profile?.coach_code ?? null;
  const clientCount = count ?? 0;
  const isCoach = coachCode !== null || clientCount > 0;

  return { isCoach, clientCount, coachCode };
}

export function useCoachStatus(): CoachStatus {
  const [status, setStatus] = useState<CoachStatus>(
    cachedStatus ? { ...cachedStatus, loading: false } : DEFAULT
  );

  useEffect(() => {
    if (cachedStatus) {
      setStatus({ ...cachedStatus, loading: false });
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchCoachStatus().then(s => {
        cachedStatus = s;
        fetchPromise = null;
        return s;
      });
    }

    fetchPromise.then(s => setStatus({ ...s, loading: false }));
  }, []);

  return status;
}

export function resetCoachCache() {
  cachedStatus = null;
  fetchPromise = null;
}

export async function refreshCoachStatus(): Promise<Omit<CoachStatus, 'loading'>> {
  cachedStatus = null;
  fetchPromise = null;
  const s = await fetchCoachStatus();
  cachedStatus = s;
  return s;
}
