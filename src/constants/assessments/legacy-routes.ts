/**
 * OLA 4 · Capa LEGACY_ROUTES (Anexo C, pieza 5).
 *
 * Setenta y cuatro lugares de la app empujan rutas viejas de evaluaciones.
 * Reescribirlos en este PR sería un diff enorme donde lo arriesgado (mover
 * pantallas de datos de salud) se escondería entre lo trivial (cambiar strings).
 * Así que las rutas viejas se quedan y REDIRIGEN, derivando el destino del
 * registry: una sola fuente, cero tablas paralelas que se despeguen.
 *
 * Solo se declara redirigible lo que ya tiene destino vivo. Mientras una pieza
 * no aterrice, su ruta vieja sigue siendo la casa de verdad y aquí no aparece.
 */
import { ASSESSMENTS, ASSESSMENT_BY_ID } from './registry';

/** Destino de Tests cuando la ruta vieja no dice a cuál evaluación iba. */
export const TESTS_HUB = '/tests';

/**
 * Rutas viejas sin parámetros, con su destino nuevo.
 * Las que llevaban el quiz en el query string no caben en un mapa plano y se
 * resuelven con las funciones de abajo.
 */
export const LEGACY_ROUTES: Record<string, string> = Object.fromEntries(
  ASSESSMENTS.flatMap((a) =>
    (a.live ? a.legacyRoutes ?? [] : [])
      .filter((r) => !r.includes('?'))
      .map((r) => [r, a.route] as const),
  ),
);

/** Los seis hubs que /tests absorbió (pieza 2). Enseñaban lo mismo desde ángulos distintos. */
export const LEGACY_HUBS: Record<string, string> = {
  '/quizzes': TESTS_HUB,
  '/salud/mis-evaluaciones': TESTS_HUB,
  '/edad-atp/cinematic-tests-index': TESTS_HUB,
  '/edad-atp/tests': TESTS_HUB,
  '/edad-atp/questionnaires': TESTS_HUB,
  '/historia-clinica': TESTS_HUB,
};

/**
 * Vistas de RESULTADO que también se mudaron. No son puertas al test: quien
 * abre un link viejo a su cronotipo quiere ver el suyo, no volver a contestar.
 */
export const LEGACY_RESULTS: Record<string, string> = {
  '/my-chronotype': '/tests/resultado/cronotipo',
};

/** A dónde va ahora /functional-quiz?quiz_id=X. */
export function functionalQuizRoute(quizId?: string | null): string {
  const a = quizId ? ASSESSMENT_BY_ID[quizId] : undefined;
  return a?.live ? a.route : TESTS_HUB;
}

/** A dónde va ahora /quiz-take?quiz_id=X. Los de base de datos llevan prefijo. */
export function dbQuizRoute(quizId?: string | null): string {
  const a = quizId ? ASSESSMENT_BY_ID[`db-${quizId}`] : undefined;
  return a?.live ? a.route : TESTS_HUB;
}

/** Resuelve cualquier ruta vieja sin parámetros. Devuelve undefined si no lo es. */
export function legacyTarget(path: string): string | undefined {
  return LEGACY_ROUTES[path] ?? LEGACY_HUBS[path] ?? LEGACY_RESULTS[path];
}
