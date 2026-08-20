/**
 * health-input: RETIRADA A ALIAS (Barrido D, 20-ago-2026).
 *
 * El formulario general de salud fue absorbido por /salud/mis-datos (que
 * consolida las 8 pantallas viejas de captura) y ningún enlace vivo llegaba
 * acá: su único consumidor era el fallback de captureRouteFor, que hoy ya
 * apunta a /salud/mis-datos. La pantalla completa vive en el historial de
 * git (403 líneas, hasta el commit padre de este). La ruta queda como alias
 * para deep links viejos.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function HealthInputRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace('/salud/mis-datos');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
