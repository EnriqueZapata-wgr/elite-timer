/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 *
 * Los 5 cuestionarios funcionales los corre el motor único de /tests/q/[id].
 * Esta ruta se queda porque el quiz viajaba en el query string y hay call
 * sites, deep links y builds OTA viejos que la siguen empujando; el destino
 * sale del registry, no de una lista escrita aparte.
 */
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { functionalQuizRoute } from '@/src/constants/assessments/legacy-routes';

export default function FunctionalQuizRedirect() {
  const { quiz_id } = useLocalSearchParams<{ quiz_id?: string }>();
  return <Redirect href={functionalQuizRoute(quiz_id) as Href} />;
}
