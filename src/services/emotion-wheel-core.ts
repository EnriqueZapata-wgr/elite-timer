/**
 * Emotion Wheel Core — lógica PURA de la rueda de emociones (MB-10 · Track A).
 *
 * La rueda es la nueva puerta principal del check-in: 3 anillos con
 * acercamiento de cámara (núcleos → familias → emociones), validada en
 * prototipo con Enrique. Este núcleo decide, de forma determinista y testeable:
 *
 *  - 🔑 A.2 · ARCO PROPORCIONAL AL CONTENIDO: cada emoción recibe exactamente
 *    360/144 = 2.5°, así que NINGUNA es más difícil de tocar que otra. El
 *    núcleo de 42 ocupa 105°; el de 8 ocupa 20°. La rueda se ve dispareja y
 *    eso es honesto: hay más palabras en español para el bajón que para el empuje.
 *  - A.3 · qué etiqueta se dibuja en cada nivel: SOLO si cabe (tangencial y
 *    radial) y SOLO si es legible en pantalla a la escala de ese nivel.
 *    Nada encimado, nunca.
 *  - A.5 · texto radial que nunca se lee de cabeza (volteo del lado izquierdo).
 *
 * La jerarquía viene de emotion-wheel-config (UN archivo). Aquí no hay datos.
 * Sin imports de react-native → Vitest node.
 */
import { EMOTIONS, type Emotion, type EmotionFamily } from '../data/emotions-library';
import { WHEEL_CORES, FAMILY_LABELS, type EmotionCore } from '../data/emotion-wheel-config';
import { colorAtPoint, normX, normY } from './emotion-map-core';

// ═══ MUNDO DE LA RUEDA (px lógicos; la vista lo escala) ═══

/** Lado del mundo cuadrado de la rueda. Se renderiza a este tamaño y la
 *  cámara lo escala HACIA ABAJO en niveles lejanos — así el nivel 2 (donde se
 *  leen las 144) queda a escala ~1 y el texto llega nítido, no rasterizado. */
export const WHEEL_WORLD = 1440;
export const WHEEL_CX = WHEEL_WORLD / 2;
export const WHEEL_CY = WHEEL_WORLD / 2;

/** Anillos (radios internos/externos). El hueco central (< CORE_R0) es el
 *  contador "N aquí" y el control de subir nivel. */
export const CORE_R0 = 155;
export const CORE_R1 = 300;
export const FAM_R0 = 306;
export const FAM_R1 = 470;
export const EMO_R0 = 476;
export const EMO_R1 = 714;

/** Grados por emoción: la constante que hace la rueda justa (A.2). */
export const DEG_PER_EMOTION = 360 / 144;

/** Zoom multiplicador por nivel (sobre la escala de ajuste del viewport). */
export const LEVEL_ZOOM: [number, number, number] = [1, 2.15, 3.4];
/** Radio focal de la cámara por nivel (dónde se centra al entrar al sector). */
export const FOCUS_R_BY_LEVEL: [number, number, number] = [0, 435, 510];

/** Tipografía en px de MUNDO. La legibilidad se evalúa contra la escala. */
export const CORE_FONT_WIDE = 48;   // núcleos anchos, texto horizontal
export const CORE_FONT_NARROW = 40; // núcleos angostos, texto radial
export const FAM_FONT = 24;
export const EMO_FONT = 14.5;
/** Ancho de carácter aproximado (fracción del font size, Poppins semibold). */
export const CHAR_W = 0.58;
/** Altura de línea mínima que un arco debe dar para que el texto no se encime. */
const LINE_FIT = 1.1;
/** Por debajo de esto en PANTALLA, la etiqueta no aporta: no se pinta. */
export const MIN_LABEL_SCREEN_PX = 10;

// ═══ TIPOS ═══

export type WheelLevel = 0 | 1 | 2;

export interface WheelSector {
  kind: 'core' | 'family' | 'emotion';
  key: string;
  label: string;
  core: EmotionCore;
  family?: EmotionFamily;
  /** Grados en sentido HORARIO desde las 12 (convención de la rueda). */
  startDeg: number;
  endDeg: number;
  midDeg: number;
  /** Emociones contenidas (1 para kind='emotion'). */
  count: number;
  color: string;
}

export interface WheelEmotionSector extends WheelSector {
  kind: 'emotion';
  emotionId: string;
}

export interface WheelLayout {
  cores: WheelSector[];
  families: WheelSector[];
  emotions: WheelEmotionSector[];
}

// ═══ VALIDACIÓN — la jerarquía del config debe cubrir EXACTAMENTE la librería ═══

export function validateWheelConfig(emotions: Emotion[] = EMOTIONS): string[] {
  const errors: string[] = [];
  const seen = new Map<EmotionFamily, EmotionCore>();
  for (const core of WHEEL_CORES) {
    for (const fam of core.families) {
      if (seen.has(fam)) errors.push(`Familia repetida en la rueda: ${fam} (${seen.get(fam)} y ${core.key})`);
      seen.set(fam, core.key);
    }
  }
  const allFamilies = new Set(emotions.map((e) => e.family));
  for (const fam of allFamilies) {
    if (!seen.has(fam)) errors.push(`Familia sin núcleo en la rueda: ${fam}`);
  }
  for (const fam of seen.keys()) {
    if (!allFamilies.has(fam)) errors.push(`Familia en la rueda sin emociones en la librería: ${fam}`);
  }
  return errors;
}

// ═══ LAYOUT — proporcional por construcción ═══

/** Orden determinista dentro de una familia: el gradiente de energía sigue la
 *  dirección del arco (agradable baja en horario; desagradable sube). */
function sortFamilyEmotions(members: Emotion[], side: 'pleasant' | 'unpleasant'): Emotion[] {
  const dir = side === 'pleasant' ? -1 : 1;
  return [...members].sort((a, b) =>
    dir * (a.energy - b.energy) ||
    dir * (a.intensity - b.intensity) ||
    (a.id < b.id ? -1 : 1));
}

function meanColor(members: Emotion[]): string {
  let sx = 0;
  let sy = 0;
  for (const e of members) {
    sx += normX(e.quadrant, e.intensity);
    sy += normY(e.energy);
  }
  const n = Math.max(1, members.length);
  return colorAtPoint(sx / n, sy / n);
}

export function buildWheelLayout(emotions: Emotion[] = EMOTIONS): WheelLayout {
  const byFamily = new Map<EmotionFamily, Emotion[]>();
  for (const e of emotions) {
    const list = byFamily.get(e.family) ?? [];
    list.push(e);
    byFamily.set(e.family, list);
  }

  const cores: WheelSector[] = [];
  const families: WheelSector[] = [];
  const emotionSectors: WheelEmotionSector[] = [];

  let cursor = 0;
  for (const core of WHEEL_CORES) {
    const coreStart = cursor;
    const coreMembers: Emotion[] = [];
    for (const fam of core.families) {
      const members = sortFamilyEmotions(byFamily.get(fam) ?? [], core.side);
      const famStart = cursor;
      for (const e of members) {
        const start = cursor;
        cursor += DEG_PER_EMOTION;
        emotionSectors.push({
          kind: 'emotion',
          key: e.id,
          emotionId: e.id,
          label: e.label,
          core: core.key,
          family: fam,
          startDeg: start,
          endDeg: cursor,
          midDeg: (start + cursor) / 2,
          count: 1,
          color: colorAtPoint(normX(e.quadrant, e.intensity), normY(e.energy)),
        });
      }
      families.push({
        kind: 'family',
        key: fam,
        label: FAMILY_LABELS[fam],
        core: core.key,
        family: fam,
        startDeg: famStart,
        endDeg: cursor,
        midDeg: (famStart + cursor) / 2,
        count: members.length,
        color: meanColor(members),
      });
      coreMembers.push(...members);
    }
    cores.push({
      kind: 'core',
      key: core.key,
      label: core.label,
      core: core.key,
      startDeg: coreStart,
      endDeg: cursor,
      midDeg: (coreStart + cursor) / 2,
      count: coreMembers.length,
      color: meanColor(coreMembers),
    });
  }

  return { cores, families, emotions: emotionSectors };
}

// ═══ GEOMETRÍA ═══

/** Punto en pantalla de un ángulo horario-desde-las-12 y radio. */
export function wheelPoint(deg: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: WHEEL_CX + r * Math.sin(rad), y: WHEEL_CY - r * Math.cos(rad) };
}

/** Path SVG de un sector anular (rebanada de dona). Sweep horario. */
export function annularSectorPath(r0: number, r1: number, startDeg: number, endDeg: number): string {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const a = wheelPoint(startDeg, r1);
  const b = wheelPoint(endDeg, r1);
  const c = wheelPoint(endDeg, r0);
  const d = wheelPoint(startDeg, r0);
  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export interface RadialTextTransform {
  /** Rotación del texto en grados (SVG, horario). Siempre en (-90, 90]. */
  rotateDeg: number;
  /** Ancla: 'start' = crece hacia AFUERA (lado derecho); 'end' = el texto se
   *  ancla en el radio exterior y corre hacia adentro (lado izquierdo). */
  anchor: 'start' | 'end';
}

/**
 * A.5 · Texto radial que NUNCA se lee de cabeza: en la mitad derecha corre
 * hacia afuera; en la izquierda se voltea 180° y se ancla al revés.
 */
export function radialTextTransform(midDeg: number): RadialTextTransform {
  const deg = ((midDeg % 360) + 360) % 360;
  if (deg <= 180) return { rotateDeg: deg - 90, anchor: 'start' };
  return { rotateDeg: deg - 270, anchor: 'end' };
}

// ═══ ETIQUETAS — solo si caben, solo si se leen (A.3) ═══

/** ¿La etiqueta es legible en PANTALLA a esta escala de cámara? */
export function labelIsReadable(fontWorld: number, scale: number): boolean {
  return fontWorld * scale >= MIN_LABEL_SCREEN_PX;
}

/** ¿El texto radial cabe en su sector? (alto tangencial + largo radial). */
export function radialLabelFits(label: string, fontWorld: number, arcDeg: number, r0: number, r1: number): boolean {
  const tangential = (arcDeg * Math.PI / 180) * r0;
  if (tangential < fontWorld * LINE_FIT) return false;
  return (r1 - r0) >= label.length * fontWorld * CHAR_W;
}

export type CoreLabelMode = 'horizontal' | 'radial' | 'hidden';

/**
 * Núcleos anchos (Tristeza 105°, Alegría 82.5°…) llevan el nombre horizontal
 * en el centro del arco; los angostos (Fuerza 20°, Enojo 30°) lo llevan
 * radial. Si ninguna forma cabe, no se pinta — nada encimado, nunca.
 */
export function coreLabelMode(sector: WheelSector): CoreLabelMode {
  const rMid = (CORE_R0 + CORE_R1) / 2;
  const arcDeg = sector.endDeg - sector.startDeg;
  const chord = 2 * rMid * Math.sin((arcDeg * Math.PI / 180) / 2);
  if (chord >= sector.label.length * CORE_FONT_WIDE * CHAR_W) return 'horizontal';
  if (radialLabelFits(sector.label, CORE_FONT_NARROW, arcDeg, CORE_R0, CORE_R1)) return 'radial';
  return 'hidden';
}

/** ¿Se pinta la etiqueta de familia? (cabe en el sector + legible a la escala). */
export function familyLabelVisible(sector: WheelSector, scale: number): boolean {
  return labelIsReadable(FAM_FONT, scale) &&
    radialLabelFits(sector.label, FAM_FONT, sector.endDeg - sector.startDeg, FAM_R0, FAM_R1);
}

/** ¿Se pinta la etiqueta de una emoción? */
export function emotionLabelVisible(sector: WheelSector, scale: number): boolean {
  return labelIsReadable(EMO_FONT, scale) &&
    radialLabelFits(sector.label, EMO_FONT, sector.endDeg - sector.startDeg, EMO_R0, EMO_R1);
}

// ═══ CÁMARA ═══

export interface WheelFocus {
  /** Punto del mundo que la cámara centra. */
  fx: number;
  fy: number;
  /** Multiplicador de zoom sobre la escala de ajuste del viewport. */
  zoomMul: number;
}

/** A dónde entra la cámara al enfocar un sector en un nivel. */
export function sectorFocus(midDeg: number, level: WheelLevel): WheelFocus {
  if (level === 0) return { fx: WHEEL_CX, fy: WHEEL_CY, zoomMul: LEVEL_ZOOM[0] };
  const p = wheelPoint(midDeg, FOCUS_R_BY_LEVEL[level]);
  return { fx: p.x, fy: p.y, zoomMul: LEVEL_ZOOM[level] };
}

/** Sector de una emoción por id (para búsqueda / preselección / puerta cuerpo). */
export function findEmotionSector(layout: WheelLayout, emotionId: string): WheelEmotionSector | null {
  return layout.emotions.find((s) => s.emotionId === emotionId) ?? null;
}

/** Sector de una familia por clave. */
export function findFamilySector(layout: WheelLayout, family: EmotionFamily): WheelSector | null {
  return layout.families.find((s) => s.family === family) ?? null;
}
