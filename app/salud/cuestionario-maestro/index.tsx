/**
 * Redirect legacy (Ola 4, Anexo C, pieza 5).
 * El Cuestionario Maestro corre en el motor unico, que nacio de su propio
 * automata (master-quiz-core, intocado).
 */
import { Redirect } from 'expo-router';

export default function CuestionarioMaestroRedirect() {
  return <Redirect href="/tests/q/maestro" />;
}
