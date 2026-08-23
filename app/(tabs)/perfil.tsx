/**
 * Tab vieja Perfil — redirect para deep links externos (OLA0 QW-6).
 *
 * G09 (20-ago-2026): era un <Redirect> declarativo y dejaba la pantalla EN
 * BLANCO al entrar por deep link: el barrido del 19-ago capturó blanco puro
 * (1 color, sin tab bar) en /biblioteca y /perfil, y el audit-visual tuvo que
 * reiniciar la app en los dos. Un <Redirect> que se monta DENTRO del grupo
 * (tabs) mientras el guard de consentimiento del layout está en 'consultando'
 * compite con el montaje del propio grupo. Con useEffect + replace, la
 * navegación sale DESPUÉS del primer render y el fondo mientras tanto es el
 * del tema, no el vacío.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function PerfilRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace('/settings');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
