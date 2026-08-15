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
import { registrarRuta } from '@/src/services/argos-last-route';

export function ArgosRouteTracker() {
  const pathname = usePathname();
  useEffect(() => { registrarRuta(pathname); }, [pathname]);
  return null;
}
