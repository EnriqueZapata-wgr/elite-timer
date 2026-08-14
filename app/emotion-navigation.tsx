/**
 * Redirect legacy (OLA5 pieza 2, ANEXO_D §2).
 * Navegar era una ruta hermana a la que solo se llegaba desde el cierre del
 * check-in: en realidad era su paso 3. Hoy vive dentro de /checkin como
 * sub-máquina. ?emotionId= se conserva, que sin emoción de origen no hay nada
 * que navegar y lo que toca es hacer el check-in. Esta ruta queda solo para
 * deep links y builds OTA viejos.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EmotionNavigationRedirect() {
  const { emotionId } = useLocalSearchParams<{ emotionId?: string }>();
  return (
    <Redirect
      href={emotionId
        ? { pathname: '/checkin', params: { emotionId, step: 'navegar' } }
        : '/checkin'}
    />
  );
}
