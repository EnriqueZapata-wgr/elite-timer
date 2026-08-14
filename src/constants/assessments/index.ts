/**
 * OLA 4 · Puerta única del registry de evaluaciones.
 * Lo que consume el hub, el motor y el runner sale de aquí.
 */
export * from './types';
export { ASSESSMENTS, ASSESSMENT_BY_ID, SECTION_META } from './registry';

import { ASSESSMENTS } from './registry';
import type { Assessment, AssessmentSection } from './types';

/** Las filas normales de una sección: sin hero ni card destacada. */
export function assessmentsBySection(section: AssessmentSection): Assessment[] {
  return ASSESSMENTS.filter((a) => a.section === section && !a.highlight);
}

/** La pieza que encabeza el hub (Braverman). */
export function heroAssessment(): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.highlight === 'hero');
}

/** La card destacada (Cuestionario Maestro). */
export function masterAssessment(): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.highlight === 'master');
}

export function getAssessment(id: string): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.id === id);
}

/**
 * A dónde manda el hub HOY.
 *
 * El colapso de 37 rutas a 8 se hace por piezas: mientras el motor o el runner
 * de una evaluación no existan, la fila abre la pantalla original. Así el hub
 * es útil desde el primer commit y nadie se topa con una ruta vacía. Cuando la
 * pieza aterriza, la entrada prende `live` y esta función devuelve la nueva.
 */
export function currentRoute(a: Assessment): string {
  if (a.live) return a.route;
  return a.legacyRoutes?.[0] ?? a.route;
}

/**
 * Tablas que hay que consultar para saber qué está completado, agrupadas.
 * useAssessmentCompletion() lee esto y hace una consulta por tabla en vez de
 * una por evaluación: hoy cada hub reimplementa la suya.
 */
export function completionTables(): string[] {
  const tables = new Set<string>();
  for (const a of ASSESSMENTS) {
    if (a.persist.completion.rule !== 'pure') tables.add(a.persist.table);
  }
  return [...tables].sort();
}

/**
 * Mapa de ruta vieja a ruta nueva, derivado del registry.
 * Alimenta la capa LEGACY_ROUTES para no reescribir los call sites de golpe.
 */
export function legacyRouteMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of ASSESSMENTS) {
    for (const legacy of a.legacyRoutes ?? []) map[legacy] = a.route;
  }
  return map;
}
