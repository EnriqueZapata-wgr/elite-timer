/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 *
 * El quiz de base de datos lo corre el motor único de /tests/q/[id], que
 * además le da el resume que esta pantalla nunca tuvo. La ruta se queda
 * porque el quiz viajaba en el query string y hay call sites vivos.
 */
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { dbQuizRoute } from '@/src/constants/assessments/legacy-routes';

export default function QuizTakeRedirect() {
  const { quiz_id } = useLocalSearchParams<{ quiz_id?: string }>();
  return <Redirect href={dbQuizRoute(quiz_id) as Href} />;
}
