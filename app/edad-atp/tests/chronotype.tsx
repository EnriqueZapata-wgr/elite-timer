/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * Alias de Edad ATP. Antes reenviaba a /quiz/chronotype, que ahora tambien es
 * un redirect: se apunta directo al destino para no encadenar dos saltos.
 */
import { Redirect } from 'expo-router';

export default function ChronotypeTestRedirect() {
  return <Redirect href="/tests/q/cronotipo" />;
}
