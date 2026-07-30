/**
 * Emotion Grid Core — la REGLA DEL CUERPO del check-in (Pieza 2 · MB-14).
 *
 * El mapa corporal solo se ofrece tras una emoción de cuadrante desagradable
 * con intensidad 7 o más. (El orden y el tono de la cuadrícula de MB-14 se
 * retiraron con MoodGrid: el plano 12x12 vive en emotion-plane-core.)
 *
 * Sin imports de react-native/supabase → Vitest node.
 */
import { EMOTIONS, type QuadrantKey } from '../data/emotions-library';

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

// ═══ PIEZA 2 · REGLA DEL CUERPO ═══

/** Intensidad mínima (en cuadrante desagradable) para ofrecer el mapa corporal. */
export const BODY_MAP_MIN_INTENSITY = 7;

export function isUnpleasant(quadrant: QuadrantKey): boolean {
  return quadrant === 'high_unpleasant' || quadrant === 'low_unpleasant';
}

/**
 * true si ALGUNA emoción seleccionada es de cuadrante desagradable con
 * intensidad >= BODY_MAP_MIN_INTENSITY. En cualquier otro caso el mapa
 * corporal NO se muestra (a quien se siente bien, ninguna zona le aplica).
 */
export function shouldOfferBodyMap(emotionIds: string[]): boolean {
  return emotionIds.some((id) => {
    const e = BY_ID.get(id);
    return !!e && isUnpleasant(e.quadrant) && e.intensity >= BODY_MAP_MIN_INTENSITY;
  });
}
