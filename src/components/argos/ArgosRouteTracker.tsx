/**
 * ArgosRouteTracker — el único suscriptor del pathname que ARGOS necesita.
 *
 * No pinta nada. Vive en el layout raíz y va anotando la pantalla actual en
 * argos-last-route, que es de donde prepareChatTurn saca el contexto para que
 * ARGOS sepa dónde estás parado.
 *
 * Es un componente y no un efecto suelto porque `usePathname` es un hook: hace
 * falta un punto de montaje. Toda la lógica (incluida la regla de ignorar las
 * rutas del propio ARGOS) vive en el servicio, que sí es testeable.
 */
import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { registrarRuta } from '@/src/services/argos-last-route';

export function ArgosRouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    registrarRuta(pathname);
    // ATP-MOBILE-P: un crash NATIVO no trae pila de JS, asi que hoy llega
    // sin saber que pantalla estaba montada. Con este tag el proximo evento
    // se explica solo. No cuesta nada: el pathname ya estaba aqui.
    Sentry.setTag('ruta', pathname);
  }, [pathname]);
  return null;
}
