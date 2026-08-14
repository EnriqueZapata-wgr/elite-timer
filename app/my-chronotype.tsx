/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * La vista de TU cronotipo se mudó a /tests/resultado/cronotipo, que es la
 * ruta que el registry declara como resultado. Esta queda para los call sites
 * vivos, los deep links y los builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function MyChronotypeRedirect() {
  return <Redirect href="/tests/resultado/cronotipo" />;
}
