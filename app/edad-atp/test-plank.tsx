/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El cronometro del plank vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function TestPlankRedirect() {
  return <Redirect href="/tests/run/plank" />;
}
