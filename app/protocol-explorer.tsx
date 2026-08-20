/**
 * protocol-explorer — RETIRADA A ALIAS (A-1, 20-ago-2026, autorizado dueño).
 *
 * Era el catálogo del modelo anterior al pivote del 16-ago: protocolos que
 * "tu coach publicará pronto". Ese modelo murió: hoy el día lo arman las
 * intervenciones activas (Mi Protocolo) y la puerta para encenderlas son los
 * casos de uso. La pantalla completa vive en el historial de git
 * (553 líneas, hasta el commit padre de este) por si algo hubiera que
 * rescatar. La ruta se queda como alias para deep links viejos.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function ProtocolExplorerRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace('/salud/intervenciones');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
