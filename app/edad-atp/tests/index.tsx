/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El indice de tests de Edad ATP listaba los mismos fisicos. Lo absorbio el hub unico /tests, que lee
 * todo del registry y el completado de un jalon.
 */
import { Redirect } from 'expo-router';

export default function EdadTestsIndexRedirect() {
  return <Redirect href="/tests" />;
}
