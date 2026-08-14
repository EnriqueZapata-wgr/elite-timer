/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * Mis evaluaciones era el mismo listado con otro molde. Lo absorbio el hub unico /tests, que lee
 * todo del registry y el completado de un jalon.
 */
import { Redirect } from 'expo-router';

export default function MisEvaluacionesRedirect() {
  return <Redirect href="/tests" />;
}
