/**
 * Preferencias de comida — redirect (OLA3 · Anexo D §1).
 *
 * Es la pestaña Preferencias de /cocina, al lado de su único consumidor: el
 * generador de recetas. El stub se queda porque hay deep links y accesos
 * viejos apuntando aquí; los params viajan al destino, no se pierde contexto.
 *
 * Barrido C (20-ago-2026): era un <Redirect> declarativo y el barrido visual
 * lo capturó en negro puro — mismo mal que G09 en las tabs. Ahora redirige
 * imperativo con fondo del tema, como protocol-explorer.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function FoodPreferencesRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace({ pathname: '/cocina', params: { tab: 'preferencias' } });
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
