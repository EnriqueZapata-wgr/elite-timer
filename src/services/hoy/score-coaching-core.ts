/**
 * Score → coaching — lógica PURA (MB-1.5 §3, patrón Whoop "score = coaching").
 *
 * El número del día no es decorativo: al tocar la card TU DÍA debe llevar a la
 * ACCIÓN pendiente que más mueve el score hoy. Este core la elige a partir de
 * lo que day-compiler ya computa (electrones booleanos + cuantitativos con
 * weight), sin tocar el cálculo del score (fuera de alcance).
 *
 * Solo son candidatas las acciones con DESTINO navegable (mapa abajo). Los
 * toggles sin pantalla propia (baño frío, grounding, lentes rojos, no-alcohol,
 * sin procesados, off-pantallas) se resuelven palomeando su card en el propio
 * HOY — no hay a dónde llevarlos, así que no compiten.
 *
 * Sin react-native/supabase → testeable con vitest (patrón *-core del repo).
 */

/** Destino granular por source (doctrina: un dato = un lugar). */
export const COACHING_ROUTES: Record<string, string> = {
  sunlight: '/solar',
  meditation: '/meditation',
  supplements: '/supplements',
  breathwork: '/breathing',
  checkin: '/checkin',
  journal: '/journal',
  cardio: '/log-cardio',
  nback: '/mente/nback',
  period_log: '/cycle',
  // Fitness: ruta actual del pilar (granular queda para MB-3)
  strength: '/fitness-hub',
  steps: '/fitness-hub',
  // Cuantitativos
  protein: '/food-log',
  water: '/hydration',
  sleep: '/sleep',
};

export interface CoachingBoolInput {
  source: string;
  name: string;
  weight: number;
  completed: boolean;
}

export interface CoachingQuantInput {
  source: string;
  name: string;
  weight: number;
  current: number;
  target: number;
}

export interface CoachingAction {
  source: string;
  name: string;
  route: string;
  /** E- que aún puede ganar hoy con esta acción (weight restante). */
  remainingWeight: number;
}

/**
 * La acción pendiente que más mueve el score hoy, o null si no queda ninguna
 * navegable (día completo → el caller cae al destino de progreso).
 * Cuantitativos: peso restante proporcional a lo que falta de la meta.
 * Empate: gana la primera en el orden de entrada (orden del día compilado).
 */
export function topScoreMover(
  booleans: readonly CoachingBoolInput[],
  quants: readonly CoachingQuantInput[],
): CoachingAction | null {
  const candidates: CoachingAction[] = [];
  for (const b of booleans) {
    const route = COACHING_ROUTES[b.source];
    if (!route || b.completed || !(b.weight > 0)) continue;
    candidates.push({ source: b.source, name: b.name, route, remainingWeight: b.weight });
  }
  for (const q of quants) {
    const route = COACHING_ROUTES[q.source];
    if (!route || !(q.weight > 0) || !(q.target > 0)) continue;
    const ratio = Math.min(1, Math.max(0, q.current / q.target));
    if (ratio >= 1) continue;
    const remaining = q.weight * (1 - ratio);
    candidates.push({
      source: q.source,
      name: q.name,
      route,
      remainingWeight: Math.round(remaining * 10) / 10,
    });
  }
  if (candidates.length === 0) return null;
  let top = candidates[0];
  for (const c of candidates) {
    if (c.remainingWeight > top.remainingWeight) top = c;
  }
  return top;
}
