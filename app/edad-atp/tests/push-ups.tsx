/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * La captura de push-ups vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function PushUpsTestRedirect() {
  return <Redirect href="/tests/run/push-ups" />;
}
