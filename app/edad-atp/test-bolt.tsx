/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El cronometro del BOLT vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function TestBoltRedirect() {
  return <Redirect href="/tests/run/bolt" />;
}
