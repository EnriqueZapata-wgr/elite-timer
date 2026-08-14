/**
 * Plano del check-in (MB-14 copy · MB-15 plano 12x12) — copy y estructura.
 *
 * La rueda se retiró del check-in (queda intacta para Exploración) y las
 * cuatro tarjetas de MB-14 se reemplazaron por el plano continuo 12x12
 * (MoodPlane): la posición es el significado. El texto sigue siendo <Text>
 * de React Native, el toque Pressable, y el color sale de la posición.
 *
 * Los nombres técnicos NO van en pantalla (nadie sabe qué es valencia ni
 * arousal): cada etiqueta de cuadrante describe la sensación.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */
import type { QuadrantKey } from './emotions-library';

/** Etiquetas del mapa general: la sensación, no la jerga. */
export const QUADRANT_FEEL: Record<QuadrantKey, string> = {
  high_unpleasant: 'Con mucha energía y no se siente bien',
  high_pleasant: 'Con mucha energía y se siente bien',
  low_unpleasant: 'Con poca energía y no se siente bien',
  low_pleasant: 'Con poca energía y se siente bien',
};

/** Hint del paso 1 (el plano se recorre y se acerca). */
export const GRID_HINT = 'Cada emoción vive en su lugar. Acércate y toca la tuya.';

/**
 * Hint del MODO explorar (OLA5 pieza 1): el mismo plano, sin registrar nada.
 * Vive aquí, junto al hint del paso 1, porque son la misma superficie con dos
 * intenciones — el copy no se duplica en la pantalla.
 */
export const EXPLORE_HINT = '144 palabras para lo que sientes. Recorre, acerca, toca una.';

// ═══ PIEZA 2 · EL CUERPO, DONDE SÍ TIENE SENTIDO ═══
//
// El mapa corporal deja de ser puerta de entrada (solo ofrecía estados
// negativos: si alguien se siente bien, ninguna zona aplica) y se vuelve un
// paso OPCIONAL tras elegir una emoción desagradable intensa. Ahí sí aplican
// las cuatro zonas que existen.

export const BODY_STEP_TITLE = '¿Dónde lo sientes?';
export const BODY_STEP_SUB = 'El cuerpo contesta aunque la palabra no llegue.';
export const BODY_STEP_SKIP = 'Saltar este paso';
export const BODY_STEP_CONTINUE = 'CONTINUAR';
