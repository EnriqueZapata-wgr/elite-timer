/**
 * edad-delta-core — LA convención del delta de Edad ATP, en UN solo lugar
 * (triple-audit P1.6). El número estrella ya se mostró invertido una vez
 * (diagnóstico decía "7.2 años SOBRE tu edad real" a quien está más joven)
 * porque 4 superficies hand-rolleaban el signo. Toda superficie nueva usa
 * ESTE core; ninguna vuelve a calcular el signo a mano.
 *
 *   CONVENCIÓN (motor V2, types/motor-edad-atp-v2.ts):
 *   delta = cronológica − integral · POSITIVO = MÁS JOVEN = celebrar.
 *
 * Puro (sin react-native/supabase) — testeable con vitest.
 */

/** Umbral bajo el cual el delta se considera "en línea" (ruido de cálculo). */
export const EDAD_DELTA_EVEN_THRESHOLD = 0.05;

/** Delta en años con la convención canónica: + = más joven. Redondeo a 1 decimal. */
export function edadDeltaYears(chronologicalAge: number, edadIntegral: number): number {
  return Math.round((chronologicalAge - edadIntegral) * 10) / 10;
}

export type EdadDeltaClass = 'younger' | 'older' | 'even';

/** Clasificación del delta — las superficies con copy propio parten de AQUÍ, nunca del signo a mano. */
export function classifyEdadDelta(delta: number): EdadDeltaClass {
  if (Math.abs(delta) < EDAD_DELTA_EVEN_THRESHOLD) return 'even';
  return delta > 0 ? 'younger' : 'older';
}

/** Copy estándar a partir de un delta YA calculado con la convención (cron − integral). */
export function formatEdadDeltaValue(delta: number): string {
  switch (classifyEdadDelta(delta)) {
    case 'even': return 'En línea con tu edad real';
    case 'younger': return `${delta.toFixed(1)} años más joven que tu edad real`;
    case 'older': return `${Math.abs(delta).toFixed(1)} años sobre tu edad real`;
  }
}

/** Copy estándar desde las dos edades (la forma preferida — imposible invertir). */
export function formatEdadDelta(chronologicalAge: number, edadIntegral: number): string {
  return formatEdadDeltaValue(edadDeltaYears(chronologicalAge, edadIntegral));
}
