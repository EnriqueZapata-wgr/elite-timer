/**
 * Redirect legacy (OLA5 pieza 2, ANEXO_D §2).
 * Navegar era una ruta hermana a la que solo se llegaba desde el cierre del
 * check-in: en realidad era su paso 3. Hoy vive dentro de /checkin como
 * sub-máquina. ?emotionId= se conserva, que sin emoción de origen no hay nada
 * que navegar y lo que toca es hacer el check-in. Esta ruta queda solo para
 * deep links y builds OTA viejos.
 *
 * Barrido C (20-ago-2026): era un <Redirect> declarativo y el barrido visual
 * lo capturó en negro puro — mismo mal que G09 en las tabs. Ahora redirige
 * imperativo con fondo del tema, como protocol-explorer.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function EmotionNavigationRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  const { emotionId } = useLocalSearchParams<{ emotionId?: string }>();
  useEffect(() => {
    router.replace(emotionId
      ? { pathname: '/checkin', params: { emotionId, step: 'navegar' } }
      : '/checkin');
  }, [router, emotionId]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
