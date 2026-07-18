/**
 * MedicalDisclaimerGate (#42) — envoltura de 1 línea para pantallas
 * sensibles: muestra el modal de disclaimers sobre el contenido en la
 * primera visita (o tras bump de versión). Aceptar persiste en
 * user_consent; "No aceptar" navega back (la pantalla queda bloqueada).
 *
 * Uso: return <MedicalDisclaimerGate>{contenido}</MedicalDisclaimerGate>
 */
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useMedicalDisclaimer } from '@/src/hooks/useMedicalDisclaimer';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { MedicalDisclaimerModal } from './MedicalDisclaimerModal';

export function MedicalDisclaimerGate({ children }: { children: ReactNode }) {
  const { mustShow, accept, loading } = useMedicalDisclaimer();
  const analytics = useAnalytics();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (mustShow && !loading && !trackedRef.current) {
      trackedRef.current = true;
      analytics.track(ATP_EVENTS.MEDICAL_DISCLAIMER_SHOWN, {});
    }
  }, [mustShow, loading, analytics]);

  return (
    <>
      {children}
      <MedicalDisclaimerModal
        visible={mustShow && !loading}
        mode="gate"
        onAccept={() => {
          analytics.track(ATP_EVENTS.MEDICAL_DISCLAIMER_ACCEPTED, {});
          accept();
        }}
        onDecline={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
      />
    </>
  );
}
