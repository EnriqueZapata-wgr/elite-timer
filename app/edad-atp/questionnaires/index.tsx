/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El indice de cuestionarios de Edad ATP listaba los 9 por dominio. Lo absorbio el hub unico /tests, que lee
 * todo del registry y el completado de un jalon.
 */
import { Redirect } from 'expo-router';

export default function EdadQuestionnairesIndexRedirect() {
  return <Redirect href="/tests" />;
}
