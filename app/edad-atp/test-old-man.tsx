/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * La captura del Old Man Test vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function TestOldManRedirect() {
  return <Redirect href="/tests/run/old-man" />;
}
