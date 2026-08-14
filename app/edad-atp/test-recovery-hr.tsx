/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * La captura de Recovery HR vive en el runner fisico.
 */
import { Redirect } from 'expo-router';

export default function TestRecoveryHrRedirect() {
  return <Redirect href="/tests/run/recovery-hr" />;
}
