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
import { QUADRANTS, type Emotion, type QuadrantKey } from '../data/emotions-library';
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
 * t 0..1 de la distancia Chebyshev al centro del plano: 0 en las celdas
 * centrales (emociones tibias), 1 en las esquinas (extremos). d va de 0.5
 * (celdas centrales) a 5.5 (esquinas). La comparten el tono del mapa y el
 * color canónico: una sola curva de fuerza en todo el módulo.
 */
export function planeToneT(col: number, row: number): number {
  const d = Math.max(Math.abs(col - 6.5), Math.abs(row - 6.5));
  return Math.min(1, Math.max(0, (d - 0.5) / 5));
}

/**
 * Tono según la distancia Chebyshev al centro del plano: cerca del centro
 * (emociones tibias) más suave, en las esquinas (extremos) más intenso.
 */
export function planeToneOpacity(col: number, row: number): number {
  return PLANE_TONE_MIN + planeToneT(col, row) * (PLANE_TONE_MAX - PLANE_TONE_MIN);
}

/** El fondo de la celda: familia del cuadrante POSICIONAL + tono por distancia. */
export function planeCellColor(col: number, row: number): string {
  return withOpacity(QUADRANTS[quadrantFromCell(col, row)].color, planeToneOpacity(col, row));
}

// ═══ UTILIDADES DE COLOR (mudadas del mapa circular en su retiro, MB-17) ═══

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mezcla lineal RGB entre dos hex. t ∈ [0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/**
 * ¿El color es claro? (para decidir texto negro vs blanco encima).
 * Luminancia relativa aproximada sRGB.
 */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}

// ═══ EL COLOR CANÓNICO — LA COORDENADA BAUTIZA EL COLOR (MB-17) ═══
//
// Doctrina: el color de una emoción ES el de su celda en el plano. El matiz lo
// pone el cuadrante de la POSICIÓN y la fuerza del tono la distancia al centro
// (la misma curva del mapa, planeToneT). Historial, perfil, navegación y
// exploración HEREDAN de aquí: ninguna otra fuente de color por emoción vive
// en el módulo. planeCellColor sigue siendo SOLO el fondo de la celda (trae la
// opacidad del mapa horneada); esto es el color a plena fuerza.

/** Hundimiento hacia el fondo de la celda más tibia (t=0). En la esquina
 *  (t=1) no hay hundimiento: la familia queda a plena fuerza. */
const CANON_CENTER_DEPTH = 0.35;
/** Profundidad del segundo stop del degradado canónico (hacia el fondo). */
const CANON_GRADIENT_DEPTH = 0.4;
/** El fondo contra el que se profundiza (la app vive sobre negro). */
const CANON_BG = '#000000';

function canonColorAt(col: number, row: number): string {
  const family = QUADRANTS[quadrantFromCell(col, row)].color;
  return mixHex(family, CANON_BG, CANON_CENTER_DEPTH * (1 - planeToneT(col, row)));
}

/** Color canónico de una emoción: el de su celda en el plano, a plena fuerza.
 *  La coordenada bautiza el color; todo lo demás lo hereda. */
export function emotionCanonColor(e: Emotion): string {
  return canonColorAt(e.gridCol, e.gridRow);
}

/** Degradado canónico: del color de la celda a su versión profunda (hacia
 *  el fondo), para mosaicos y heros. Derivado, nunca inventado. */
export function emotionCanonGradient(e: Emotion): [string, string] {
  const c = canonColorAt(e.gridCol, e.gridRow);
  return [c, mixHex(c, CANON_BG, CANON_GRADIENT_DEPTH)];
}

/** Color canónico del CENTRO de un cuadrante (héroe del arquetipo en perfil). */
export function quadrantCanonColor(q: QuadrantKey): string {
  const pleasant = q === 'high_pleasant' || q === 'low_pleasant';
  const high = q === 'high_pleasant' || q === 'high_unpleasant';
  return canonColorAt(pleasant ? 9.5 : 3.5, high ? 9.5 : 3.5);
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

// ═══ UTILIDADES DEL MÓDULO (mudadas del mapa circular en su retiro, MB-17) ═══

/** Hash FNV-1a 32 bits — la única fuente de "aleatoriedad" (determinista). */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Búsqueda por nombre (sin acentos, case-insensitive). */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function searchEmotions(emotions: Emotion[], query: string): Emotion[] {
  const q = normalizeSearch(query);
  if (q.length < 2) return [];
  return emotions
    .filter((e) => normalizeSearch(e.label).includes(q) || normalizeSearch(e.description).includes(q))
    .sort((a, b) => {
      // Match en el label pesa más que match solo en la descripción.
      const aLabel = normalizeSearch(a.label).includes(q) ? 0 : 1;
      const bLabel = normalizeSearch(b.label).includes(q) ? 0 : 1;
      if (aLabel !== bLabel) return aLabel - bLabel;
      return a.label.localeCompare(b.label);
    })
    .slice(0, 12);
}
