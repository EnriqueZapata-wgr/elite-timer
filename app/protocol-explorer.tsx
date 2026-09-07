/**
 * protocol-explorer: RETIRADA A ALIAS (A-1, 20-ago-2026, autorizado dueño).
 *
 * Era el catálogo del modelo anterior al pivote del 16-ago: protocolos que
 * "tu coach publicará pronto". Ese modelo murió: hoy el día lo arman las
 * intervenciones activas (Mi Protocolo) y la puerta para encenderlas son los
 * casos de uso. La pantalla completa vive en el historial de git
 * (552 líneas, hasta el commit padre de este) por si algo hubiera que
 * rescatar. La ruta se queda como alias para deep links viejos.
 *
 * 7-sep-2026 (pivote limpio): apuntaba a /salud/intervenciones, que HOY tambien
 * es redirect. Un alias que apunta a otro alias se pierde dos veces: el deep
 * link rebota dos pantallas y el indice de ARGOS no encuentra dueno al que
 * donarle este vocabulario. Ahora va directo a /agenda.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function ProtocolExplorerRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace('/agenda');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
