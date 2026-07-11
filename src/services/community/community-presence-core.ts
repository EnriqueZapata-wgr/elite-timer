/**
 * Presencia de comunidad — núcleo PURO (sin react-native/supabase), testeable.
 *
 * Regla HONESTA de social proof (decisión del mapa Comunidad): NUNCA inventamos
 * números. Si hay pocos usuarios activos (< PRESENCE_MIN_COUNT) mostramos un
 * placeholder neutro en vez de un conteo ridículo o falso. A partir del umbral
 * mostramos el conteo real.
 */

/** Umbral mínimo para mostrar un conteo real (debajo → placeholder honesto). */
export const PRESENCE_MIN_COUNT = 10;

export type PresenceDisplay =
  | { mode: 'placeholder'; text: string }
  | { mode: 'count'; count: number; text: string };

/**
 * Deriva el estado visible de una presencia a partir de un conteo crudo.
 * - count < PRESENCE_MIN_COUNT → placeholder ('En comunidad · verifica pronto').
 * - count >= PRESENCE_MIN_COUNT → conteo real ('N personas activas hoy').
 * Un conteo inválido (negativo/NaN) se trata como 0 (placeholder).
 */
export function presenceDisplay(count: number): PresenceDisplay {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n < PRESENCE_MIN_COUNT) {
    return { mode: 'placeholder', text: 'En comunidad · verifica pronto' };
  }
  return { mode: 'count', count: n, text: `${n} personas activas hoy` };
}
