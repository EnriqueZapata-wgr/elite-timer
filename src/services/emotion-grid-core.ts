/**
 * Emotion Grid Core — lógica PURA de la cuadrícula del check-in (MB-14).
 *
 * Tres decisiones viven aquí y son testeables en node:
 *  - el ORDEN de las celdas de un cuadrante (suave → intensa, determinista),
 *  - el TONO de cada celda: el color sale del CUADRANTE, nunca de la emoción
 *    individual (fix de la incoherencia: había amarillos y azules dentro de la
 *    sección roja). Un cuadrante, una familia cromática, sin excepciones.
 *  - la REGLA DEL CUERPO (Pieza 2): el mapa corporal solo se ofrece tras una
 *    emoción de cuadrante desagradable con intensidad 7 o más.
 *
 * Sin imports de react-native/supabase → Vitest node.
 * (brand.ts es import seguro en node desde Batch 3.)
 */
import { EMOTIONS, QUADRANTS, type Emotion, type QuadrantKey } from '../data/emotions-library';
import { withOpacity } from '../constants/brand';

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

/**
 * Las emociones de un cuadrante en el orden de la cuadrícula: de la más suave
 * a la más intensa (el gradiente de tono se lee de arriba hacia abajo).
 * Desempate alfabético por label → orden estable entre renders y plataformas.
 */
export function emotionsForQuadrant(quadrant: QuadrantKey): Emotion[] {
  return EMOTIONS
    .filter((e) => e.quadrant === quadrant)
    .sort((a, b) => {
      if (a.intensity !== b.intensity) return a.intensity - b.intensity;
      return a.label.localeCompare(b.label, 'es');
    });
}

/**
 * Rango de opacidad del tono de celda sobre fondo negro. El techo (0.60)
 * mantiene el texto blanco legible incluso sobre el amarillo; el piso (0.14)
 * despega la celda del fondo (ELEVATION[1] ≈ #121212).
 */
export const CELL_TONE_MIN = 0.14;
export const CELL_TONE_MAX = 0.6;

/** Opacidad del tono según intensidad 1-10 — monótona creciente, con clamp. */
export function cellToneOpacity(intensity: number): number {
  const t = (Math.min(10, Math.max(1, intensity)) - 1) / 9;
  return CELL_TONE_MIN + t * (CELL_TONE_MAX - CELL_TONE_MIN);
}

/**
 * El fondo de una celda: SIEMPRE un tono del color del cuadrante, más intenso
 * mientras mayor sea la intensidad de la emoción. Ningún amarillo dentro del
 * rojo: la emoción no aporta color, solo intensidad.
 */
export function cellTone(quadrant: QuadrantKey, intensity: number): string {
  return withOpacity(QUADRANTS[quadrant].color, cellToneOpacity(intensity));
}

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
