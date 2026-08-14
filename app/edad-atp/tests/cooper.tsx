/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * La captura del Cooper vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function CooperTestRedirect() {
  return <Redirect href="/tests/run/cooper" />;
}
