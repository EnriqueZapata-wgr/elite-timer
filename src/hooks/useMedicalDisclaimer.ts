/**
 * useMedicalDisclaimer (#42) — gate de disclaimers médicos.
 *
 * Retorna { mustShow, accept, version, loading }. Chequea
 * user_consent.medical_disclaimer_accepted_at + _version (migración 155)
 * contra MEDICAL_DISCLAIMER_VERSION. Cache in-memory por sesión: una vez
 * aceptado (o verificado aceptado), ninguna otra pantalla vuelve a
 * consultar ni a mostrar el modal en esta sesión.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import {
  MEDICAL_DISCLAIMER_VERSION,
  mustShowDisclaimer,
} from '@/src/constants/medical-disclaimers';

// Cache de sesión: userId → ya verificado/aceptado la versión vigente.
let sessionAcceptedFor: string | null = null;

/** Solo para tests: resetea el cache de sesión. */
export function _resetDisclaimerSessionCache() {
  sessionAcceptedFor = null;
}

export function useMedicalDisclaimer() {
  const { user } = useAuth();
  const [mustShow, setMustShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      if (sessionAcceptedFor === user.id) {
        if (alive) { setMustShow(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('user_consent')
        .select('medical_disclaimer_accepted_at, medical_disclaimer_version')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      const show = mustShowDisclaimer(
        data?.medical_disclaimer_accepted_at,
        data?.medical_disclaimer_version,
      );
      if (!show) sessionAcceptedFor = user.id;
      setMustShow(show);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const accept = useCallback(async () => {
    if (!user?.id) return;
    // Upsert: la fila de user_consent puede no existir aún (se crea on-demand).
    const { error } = await supabase.from('user_consent').upsert({
      user_id: user.id,
      medical_disclaimer_accepted_at: new Date().toISOString(),
      medical_disclaimer_version: MEDICAL_DISCLAIMER_VERSION,
    }, { onConflict: 'user_id' });
    if (error) {
      console.warn('[disclaimer] accept:', error.message);
      return;
    }
    sessionAcceptedFor = user.id;
    setMustShow(false);
  }, [user?.id]);

  return { mustShow, accept, loading, version: MEDICAL_DISCLAIMER_VERSION };
}
