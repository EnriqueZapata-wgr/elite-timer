/**
 * /personal-records (MB-3.6 Bloque 1.1) — FUSIONADA con Fuerza.
 *
 * PRs y benchmarks eran un dato en dos lugares (doctrina navegación-vs-consulta).
 * La casa única es /fitness-strength; esta ruta queda solo como redirect para
 * deep-links viejos y el tab Progreso (que importa la pantalla fusionada).
 */
import { Redirect } from 'expo-router';

export default function PersonalRecordsRedirect() {
  return <Redirect href="/fitness-strength" />;
}
