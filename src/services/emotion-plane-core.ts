/**
 * Emotion Plane Core — lógica PURA del plano 12x12 del Mood Meter (MB-15).
 *
 * El plano es la puerta del check-in: la POSICIÓN es el significado. Columna
 * 1-12 = agrado (1 lo que peor se siente), fila 1-12 = energía (1 la fila de
 * abajo). Las coordenadas viven en emotions-library (gridCol/gridRow, commit
 * bdb818c) y son la fuente de verdad: aquí NUNCA se derivan de energy ni de
 * intensity.
 *
 * Aquí vive lo testeable en node:
 *  - el COLOR de cada celda sale de la posición, no de la emoción (regla 4 del
 *    brief: col >= 7 agradable, fila >= 7 alta energía; el tono varía con la
 *    distancia al centro, el matiz lo define la mitad del plano),
 *  - la GEOMETRÍA base de las celdas (layout fijo; el zoom es UN transform
 *    nativo del contenedor, regla 2),
 *  - los CLAMPS de cámara: escala 0.6-4.5 y desplazamiento que nunca saca el
 *    plano de la pantalla.
 *
 * Los helpers del camino del gesto llevan 'worklet': el plugin de reanimated
 * los sube al hilo de UI; en Vitest la directiva es inerte.
 *
 * Sin imports de react-native/supabase → Vitest node.
 */
import { QUADRANTS, type QuadrantKey } from '../data/emotions-library';
import { withOpacity } from '../constants/brand';

// ═══ GEOMETRÍA BASE ═══
// El plano se maqueta UNA vez a tamaño fijo y el zoom es un transform nativo
// (regla 2): sin matemática de fuente por zoom, sin etiquetas condicionales.

export const PLANE_GRID = 12;
/** Lado BASE de la celda en pt de layout (el zoom lo pone en pantalla). */
export const PLANE_CELL = 44;
/** Lado del plano completo en pt de layout. */
export const PLANE_SIZE = PLANE_GRID * PLANE_CELL;
/** Separación visual entre celdas (se descuenta del lado de la celda). */
export const PLANE_CELL_GAP = 2;

/**
 * Tipografía BASE de la palabra dentro de la celda. Estática a propósito: a
 * zoom bajo se ve chiquita (como How We Feel) y a zoom alto se lee, porque el
 * transform escala el subárbol completo. Dimensionada para que la palabra más
 * larga de la biblioteca ("arrepentimiento", 15 chars) quepa en una línea de
 * la celda — el test lo vigila.
 */
export const PLANE_FONT_SIZE = 4.3;
export const PLANE_FONT_LINE_HEIGHT = 5.4;
/** Padding horizontal interno de la celda (resta ancho útil a la palabra). */
export const PLANE_CELL_PAD_H = 1;

/** Rectángulo base de una celda. La fila 1 es la de ABAJO (menos energía). */
export function cellRect(col: number, row: number): { left: number; top: number; size: number } {
  return {
    left: (col - 1) * PLANE_CELL + PLANE_CELL_GAP / 2,
    top: (PLANE_GRID - row) * PLANE_CELL + PLANE_CELL_GAP / 2,
    size: PLANE_CELL - PLANE_CELL_GAP,
  };
}

/** Centro de una celda en coordenadas del plano (para encuadrar la cámara). */
export function cellCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - 0.5) * PLANE_CELL,
    y: (PLANE_GRID - row + 0.5) * PLANE_CELL,
  };
}

// ═══ REGLA 4 · EL COLOR SALE DE LA POSICIÓN ═══
// Cuatro familias cromáticas, una por cuadrante del plano. El matiz lo define
// en qué mitad cae la celda; la emoción no aporta color. Posición y quadrant
// coinciden hoy (el test lo cementa), pero se usa la posición de todos modos:
// si mañana se mueve una palabra, el color la sigue.

export function isPleasantCol(col: number): boolean {
  return col >= 7;
}

export function isHighRow(row: number): boolean {
  return row >= 7;
}

export function quadrantFromCell(col: number, row: number): QuadrantKey {
  if (isHighRow(row)) return isPleasantCol(col) ? 'high_pleasant' : 'high_unpleasant';
  return isPleasantCol(col) ? 'low_pleasant' : 'low_unpleasant';
}

/**
 * Rango de opacidad del tono sobre fondo negro: el techo mantiene legible el
 * texto blanco (también sobre el amarillo), el piso despega la celda del fondo.
 */
export const PLANE_TONE_MIN = 0.16;
export const PLANE_TONE_MAX = 0.55;

/**
 * Tono según la distancia Chebyshev al centro del plano: cerca del centro
 * (emociones tibias) más suave, en las esquinas (extremos) más intenso.
 * d va de 0.5 (celdas centrales) a 5.5 (esquinas).
 */
export function planeToneOpacity(col: number, row: number): number {
  const d = Math.max(Math.abs(col - 6.5), Math.abs(row - 6.5));
  const t = Math.min(1, Math.max(0, (d - 0.5) / 5));
  return PLANE_TONE_MIN + t * (PLANE_TONE_MAX - PLANE_TONE_MIN);
}

/** El fondo de la celda: familia del cuadrante POSICIONAL + tono por distancia. */
export function planeCellColor(col: number, row: number): string {
  return withOpacity(QUADRANTS[quadrantFromCell(col, row)].color, planeToneOpacity(col, row));
}

/**
 * Color de ACENTO de una posición del plano (MB-16): la familia del cuadrante
 * posicional a tono pleno, para texto, CTA y ambiente fuera del mapa.
 * planeCellColor es SOLO para el fondo de la celda: trae la opacidad del mapa
 * horneada (#RRGGBBAA) y pasarlo por withOpacity duplicaría el alpha.
 */
export function planeAccentColor(col: number, row: number): string {
  return QUADRANTS[quadrantFromCell(col, row)].color;
}

// ═══ CÁMARA ═══
// Transform con origen top-left: pantalla = mundo * escala + traslación.
// clampAxis y clampScale corren en worklets (el camino del gesto no cruza a JS).

export const PLANE_MIN_SCALE = 0.6;
export const PLANE_MAX_SCALE = 4.5;

/**
 * Escala a la que el plano completo cabe en el viewport. Es la escala INICIAL
 * (el estado de partida es el mapa general con los cuatro cuadrantes).
 */
export function planeFitScale(vw: number, vh: number): number {
  return Math.min(vw, vh) / PLANE_SIZE;
}

/**
 * Clamp de escala. minScale admite bajar de PLANE_MIN_SCALE solo si el fit del
 * device lo exige (el plano completo SIEMPRE tiene que ser alcanzable).
 */
export function clampScale(s: number, minScale: number = PLANE_MIN_SCALE): number {
  'worklet';
  return Math.min(PLANE_MAX_SCALE, Math.max(minScale, s));
}

/**
 * Clamp de un eje de traslación: con contenido más grande que el viewport, el
 * borde del plano nunca entra a la pantalla (no se puede "sacar" ni dejar en
 * negro); con contenido más chico, queda centrado y fijo.
 */
export function clampAxis(t: number, content: number, viewport: number): number {
  'worklet';
  if (content <= viewport) return (viewport - content) / 2;
  return Math.min(0, Math.max(viewport - content, t));
}

/**
 * Cámara que encuadra un punto del plano en el centro del viewport a la
 * escala dada, ya clampeada (escala y desplazamiento).
 */
export function cameraFor(
  worldX: number,
  worldY: number,
  s: number,
  vw: number,
  vh: number,
  minScale: number = PLANE_MIN_SCALE,
): { scale: number; tx: number; ty: number } {
  const scale = clampScale(s, minScale);
  const content = PLANE_SIZE * scale;
  return {
    scale,
    tx: clampAxis(vw / 2 - worldX * scale, content, vw),
    ty: clampAxis(vh / 2 - worldY * scale, content, vh),
  };
}

/** Centro del cuadrante en coordenadas del plano (atajo de las etiquetas). */
export function quadrantCenter(q: QuadrantKey): { x: number; y: number } {
  const pleasant = q === 'high_pleasant' || q === 'low_pleasant';
  const high = q === 'high_pleasant' || q === 'high_unpleasant';
  return {
    x: pleasant ? PLANE_SIZE * 0.75 : PLANE_SIZE * 0.25,
    y: high ? PLANE_SIZE * 0.25 : PLANE_SIZE * 0.75,
  };
}

/** Zoom del atajo de cuadrante, relativo al fit: el cuadrante llena la vista. */
export const QUADRANT_ZOOM_FACTOR = 2;
/** Zoom al aterrizar en una emoción (búsqueda / preselección), relativo al fit. */
export const FOCUS_ZOOM_FACTOR = 3.2;
