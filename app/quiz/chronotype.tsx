/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El cronotipo lo corre el motor unico. La rama de onboarding que tenia esta
 * pantalla ya estaba muerta: onboarding v2 usa su propio paso.
 */
import { Redirect } from 'expo-router';

export default function ChronotypeQuizRedirect() {
  return <Redirect href="/tests/q/cronotipo" />;
}
