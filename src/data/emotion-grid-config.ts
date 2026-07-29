/**
 * Cuadrícula del check-in (MB-14) — copy y estructura.
 *
 * La rueda se retira del check-in (queda intacta para Exploración): en
 * dispositivo real no pintaba una sola etiqueta y el toque directo no
 * respondía. La cuadrícula no pelea ninguna de esas peleas: el texto es
 * <Text> de React Native, el toque es Pressable, el color lo define la celda.
 *
 * Los nombres técnicos NO van en pantalla (nadie sabe qué es valencia ni
 * arousal): cada tarjeta describe la sensación.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */
import type { QuadrantKey } from './emotions-library';

/**
 * Orden 2x2 de la pantalla uno. Respeta la memoria espacial del módulo
 * (B.5 · MB-7): alta energía ARRIBA, agradable a la DERECHA.
 */
export const GRID_ROWS: readonly (readonly QuadrantKey[])[] = [
  ['high_unpleasant', 'high_pleasant'],
  ['low_unpleasant', 'low_pleasant'],
];

/** Copy de las tarjetas: la sensación, no la jerga. */
export const QUADRANT_FEEL: Record<QuadrantKey, string> = {
  high_unpleasant: 'Con mucha energía y no se siente bien',
  high_pleasant: 'Con mucha energía y se siente bien',
  low_unpleasant: 'Con poca energía y no se siente bien',
  low_pleasant: 'Con poca energía y se siente bien',
};

/** Hint del paso 1 (reemplaza el de la rueda). */
export const GRID_HINT = 'Primero cómo se siente. La palabra exacta viene después.';

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
