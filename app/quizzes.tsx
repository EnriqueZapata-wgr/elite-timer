/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * Uno de los seis hubs que ensenaban lo mismo desde angulos distintos. Lo absorbio el hub unico /tests, que lee
 * todo del registry y el completado de un jalon.
 */
import { Redirect } from 'expo-router';

export default function QuizzesHubRedirect() {
  return <Redirect href="/tests" />;
}
