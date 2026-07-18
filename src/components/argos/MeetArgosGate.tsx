/**
 * MeetArgosGate — trigger de Meet ARGOS para usuarios existentes (T3 MAGIA 2.0).
 *
 * Antes, /argos/meet solo se alcanzaba al terminar el onboarding v2. Un
 * usuario existente con argos_introduced_at = NULL (reset manual, backfill
 * incompleto) jamás veía la pantalla — solo perdía el floating button.
 *
 * Este gate observa {sesión, introduced, pathname} y navega UNA vez a
 * /argos/meet cuando el usuario ya está dentro de la app principal.
 * Lógica de decisión pura en argos-intro-core (testeada).
 */
import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/src/contexts/auth-context';
import { useArgosPresence } from './ArgosPresenceContext';
import { shouldTriggerMeetArgos } from './argos-intro-core';

export function MeetArgosGate() {
  const { user } = useAuth();
  const { introduced } = useArgosPresence();
  const pathname = usePathname();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (shouldTriggerMeetArgos({
      hasUser: !!user?.id,
      introduced,
      pathname,
      alreadyTriggered: triggeredRef.current,
    })) {
      triggeredRef.current = true;
      router.push('/argos/meet');
    }
  }, [user?.id, introduced, pathname]);

  return null;
}

export default MeetArgosGate;
