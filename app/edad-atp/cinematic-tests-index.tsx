/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El indice de pruebas cinematicas listaba los fisicos. Lo absorbio el hub unico /tests, que lee
 * todo del registry y el completado de un jalon.
 */
import { Redirect } from 'expo-router';

export default function CinematicTestsIndexRedirect() {
  return <Redirect href="/tests" />;
}
