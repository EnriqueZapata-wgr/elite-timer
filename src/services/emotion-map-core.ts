/**
 * Emotion Map Core — núcleo PURO del plano 2D de emociones (MB-4 · Bloque 1).
 *
 * Coordenadas del spec (SPEC_CHECKIN_V2_MAPA_Y_NAVEGACION §1):
 *   y = (energy - 5.5) / 4.5   → −1 (agotado) … +1 (máxima activación)
 *   x = (esAgradable ? +1 : −1) × (intensity / 10) → −1 (muy desagradable) … +1 (muy agradable)
 *
 * Los solapes (misma energía + intensidad en el mismo cuadrante) se resuelven
 * con un layout DETERMINISTA: mismo input ⇒ mismo mapa, siempre. No hay
 * Math.random — los ángulos salen de un hash FNV-1a del id. El resultado se
 * revisa a mano vía `overlaps` (reporte de qué se movió y cuánto).
 *
 * Sin imports de react-native/supabase → testeable en Vitest node.
 * brand.ts es import seguro en node desde Batch 3 (requires lazy).
 */
import { ATP_BRAND, SEMANTIC, CATEGORY_COLORS } from '../constants/brand';
import type { Emotion, QuadrantKey } from '../data/emotions-library';

// ═══ MUNDO (px lógicos del canvas interno del mapa) ═══

/** Ancho del mundo del mapa en px lógicos. */
export const WORLD_W = 1600;
/** Alto del mundo (más alto que ancho: el eje de energía respira más). */
export const WORLD_H = 2100;
/** Margen interno — los círculos no se pegan al borde físico del mundo. */
export const WORLD_PAD = 100;
/** Diámetro visual de cada emoción en px de mundo. */
export const NODE_SIZE = 96;
/** Separación mínima centro a centro tras resolver colisiones. */
export const MIN_SEP = 118;

/** Posición final de una emoción en el mundo. */
export interface EmotionMapPoint {
  id: string;
  /** Coordenadas normalizadas crudas del spec (−1…+1), SIN offset anticolisión. */
  nx: number;
  ny: number;
  /** Posición final en px de mundo (con offset anticolisión aplicado). */
  wx: number;
  wy: number;
  /** Distancia (px de mundo) que el resolver movió este punto desde su posición cruda. */
  displaced: number;
}

/** Grupo de emociones que caían EXACTAMENTE en el mismo punto del plano. */
export interface OverlapGroup {
  /** Coordenada normalizada compartida. */
  nx: number;
  ny: number;
  /** Ids en el orden determinista en que se repartieron alrededor del punto. */
  ids: string[];
}

export interface EmotionMapLayout {
  points: EmotionMapPoint[];
  /** Reporte para revisión humana: ningún solape debe dejar emociones escondidas. */
  overlaps: OverlapGroup[];
  /** Ids que el resolver desplazó más de MIN_SEP (revisión: ¿siguen en su zona?). */
  bigMoves: string[];
}

const PLEASANT: Record<QuadrantKey, boolean> = {
  high_pleasant: true,
  low_pleasant: true,
  high_unpleasant: false,
  low_unpleasant: false,
};

/** y normalizada del spec. */
export function normY(energy: number): number {
  return (energy - 5.5) / 4.5;
}

/** x normalizada del spec. */
export function normX(quadrant: QuadrantKey, intensity: number): number {
  return (PLEASANT[quadrant] ? 1 : -1) * (intensity / 10);
}

/** Normalizada → mundo. y positiva (alta energía) va ARRIBA (wy menor). */
export function toWorld(nx: number, ny: number): { wx: number; wy: number } {
  const usableW = WORLD_W - WORLD_PAD * 2;
  const usableH = WORLD_H - WORLD_PAD * 2;
  return {
    wx: WORLD_PAD + ((nx + 1) / 2) * usableW,
    wy: WORLD_PAD + ((1 - ny) / 2) * usableH,
  };
}

/** Mundo → normalizada (para leer en qué zona quedó un punto tras el offset). */
export function toNorm(wx: number, wy: number): { nx: number; ny: number } {
  const usableW = WORLD_W - WORLD_PAD * 2;
  const usableH = WORLD_H - WORLD_PAD * 2;
  return {
    nx: ((wx - WORLD_PAD) / usableW) * 2 - 1,
    ny: 1 - ((wy - WORLD_PAD) / usableH) * 2,
  };
}

/** Hash FNV-1a 32 bits — la única fuente de "aleatoriedad" (determinista). */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const CENTER_X = WORLD_W / 2;
/** Un punto agradable nunca cruza al lado desagradable (y viceversa). */
const SIGN_GUARD = 10;

function clampToSide(wx: number, pleasant: boolean): number {
  if (pleasant) return Math.max(CENTER_X + SIGN_GUARD, Math.min(WORLD_W - WORLD_PAD / 2, wx));
  return Math.min(CENTER_X - SIGN_GUARD, Math.max(WORLD_PAD / 2, wx));
}

function clampY(wy: number): number {
  return Math.max(WORLD_PAD / 2, Math.min(WORLD_H - WORLD_PAD / 2, wy));
}

/**
 * Layout determinista del mapa completo.
 *
 * 1. Posición cruda del spec.
 * 2. Solapes EXACTOS → anillo alrededor del punto (radio mínimo que garantiza
 *    MIN_SEP entre vecinos del anillo; ángulo base = hash del grupo).
 * 3. Relajación por pares (orden fijo, sin random): empuja pares más cercanos
 *    que MIN_SEP hasta separarlos. El signo de x (agradable/desagradable) se
 *    preserva SIEMPRE — una emoción no cambia de lado por un offset.
 */
export function computeEmotionMapLayout(emotions: Emotion[]): EmotionMapLayout {
  // Orden determinista de trabajo (el orden del array fuente podría cambiar).
  const sorted = [...emotions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  interface Working extends EmotionMapPoint {
    pleasant: boolean;
    rawWx: number;
    rawWy: number;
  }

  const points: Working[] = sorted.map((e) => {
    const nx = normX(e.quadrant, e.intensity);
    const ny = normY(e.energy);
    const { wx, wy } = toWorld(nx, ny);
    return { id: e.id, nx, ny, wx, wy, rawWx: wx, rawWy: wy, displaced: 0, pleasant: PLEASANT[e.quadrant] };
  });

  // ── Paso 2: grupos con posición cruda idéntica ──
  const byKey = new Map<string, Working[]>();
  for (const p of points) {
    const key = `${p.nx.toFixed(4)}|${p.ny.toFixed(4)}`;
    const g = byKey.get(key) ?? [];
    g.push(p);
    byKey.set(key, g);
  }

  const overlaps: OverlapGroup[] = [];
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    overlaps.push({ nx: group[0].nx, ny: group[0].ny, ids: group.map((p) => p.id) });
    // Radio: los n puntos del anillo quedan a >= MIN_SEP entre sí.
    const n = group.length;
    const radius = Math.max(MIN_SEP / 2 + 4, MIN_SEP / (2 * Math.sin(Math.PI / n)));
    const baseAngle = ((fnv1a(key) % 360) * Math.PI) / 180;
    group.forEach((p, i) => {
      const a = baseAngle + (2 * Math.PI * i) / n;
      p.wx = clampToSide(p.rawWx + radius * Math.cos(a), p.pleasant);
      p.wy = clampY(p.rawWy + radius * Math.sin(a));
    });
  }
  overlaps.sort((a, b) => (a.ids[0] < b.ids[0] ? -1 : 1));

  // ── Paso 3: relajación por pares (determinista) ──
  const ITERATIONS = 140;
  for (let it = 0; it < ITERATIONS; it++) {
    let movedAny = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = b.wx - a.wx;
        const dy = b.wy - a.wy;
        const dist = Math.hypot(dx, dy);
        if (dist >= MIN_SEP) continue;
        movedAny = true;
        let ux: number;
        let uy: number;
        if (dist > 0.001) {
          ux = dx / dist;
          uy = dy / dist;
        } else {
          // Mismo punto exacto tras el paso 2 (no debería, pero determinista igual).
          const ang = ((fnv1a(a.id + b.id) % 360) * Math.PI) / 180;
          ux = Math.cos(ang);
          uy = Math.sin(ang);
        }
        const push = (MIN_SEP - dist) / 2 + 0.5;
        a.wx = clampToSide(a.wx - ux * push, a.pleasant);
        a.wy = clampY(a.wy - uy * push);
        b.wx = clampToSide(b.wx + ux * push, b.pleasant);
        b.wy = clampY(b.wy + uy * push);
      }
    }
    if (!movedAny) break;
  }

  const bigMoves: string[] = [];
  for (const p of points) {
    p.displaced = Math.hypot(p.wx - p.rawWx, p.wy - p.rawWy);
    if (p.displaced > MIN_SEP) bigMoves.push(p.id);
  }

  return {
    points: points.map(({ id, nx, ny, wx, wy, displaced }) => ({ id, nx, ny, wx, wy, displaced })),
    overlaps,
    bigMoves,
  };
}

// ═══ COLOR — transición continua de la paleta ATP (cero hex crudo) ═══
//
// Bordes del plano (research doc, decidido por Enrique):
//   alta·desagradable → coral/naranja · alta·agradable → lima-amarillo
//   baja·agradable → teal · baja·desagradable → índigo/violeta
// El interior interpola: primero a lo largo del borde superior e inferior
// (con paradas intermedias para no ensuciar los mezclados), luego en vertical.

interface ColorStop {
  at: number;
  color: string;
}

/** Borde superior (y = +1): coral → naranja → ámbar → lima. */
const TOP_STOPS: ColorStop[] = [
  { at: -1, color: SEMANTIC.error },      // coral (tensión, no alarma)
  { at: -0.35, color: SEMANTIC.warning }, // naranja profundo
  { at: 0.3, color: ATP_BRAND.amber },    // lima-amarillo
  { at: 1, color: ATP_BRAND.lime },
];

/** Borde inferior (y = −1): violeta → azul índigo → teal. */
const BOTTOM_STOPS: ColorStop[] = [
  { at: -1, color: CATEGORY_COLORS.mind },      // violeta (amarra con Mente)
  { at: -0.15, color: CATEGORY_COLORS.nutrition }, // azul índigo intermedio
  { at: 1, color: ATP_BRAND.teal },
];

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

function sampleStops(stops: ColorStop[], at: number): string {
  const x = Math.max(-1, Math.min(1, at));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x <= b.at) {
      const t = (x - a.at) / (b.at - a.at);
      return mixHex(a.color, b.color, Math.max(0, Math.min(1, t)));
    }
  }
  return stops[stops.length - 1].color;
}

/**
 * Color del plano en un punto normalizado. La transición es continua en ambos
 * ejes — el color de una emoción ES su posición.
 */
export function colorAtPoint(nx: number, ny: number): string {
  const top = sampleStops(TOP_STOPS, nx);
  const bottom = sampleStops(BOTTOM_STOPS, nx);
  const t = (Math.max(-1, Math.min(1, ny)) + 1) / 2;
  return mixHex(bottom, top, t);
}

/**
 * Gradiente propio de una emoción según su posición: muestrea el plano un poco
 * arriba y un poco abajo de su y — cada emoción "carga" el degradado local.
 */
export function emotionGradient(nx: number, ny: number): [string, string] {
  return [colorAtPoint(nx, Math.min(1, ny + 0.22)), colorAtPoint(nx, Math.max(-1, ny - 0.22))];
}

/**
 * ¿El color es claro? (para decidir texto negro vs blanco encima).
 * Luminancia relativa aproximada sRGB.
 */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}

// ═══ CÁMARA — centros de aterrizaje por cuadrante ═══

/**
 * Centro normalizado de cada cuadrante para aterrizar la cámara: el usuario
 * eligió zona y el mapa abre AHÍ, nunca en el océano completo.
 */
export const QUADRANT_CENTERS: Record<QuadrantKey, { nx: number; ny: number }> = {
  high_pleasant: { nx: 0.55, ny: 0.55 },
  high_unpleasant: { nx: -0.55, ny: 0.55 },
  low_pleasant: { nx: 0.45, ny: -0.55 },
  low_unpleasant: { nx: -0.45, ny: -0.55 },
};

/** Cuadrante que corresponde a un punto normalizado arbitrario del plano. */
export function quadrantAtPoint(nx: number, ny: number): QuadrantKey {
  if (ny >= 0) return nx >= 0 ? 'high_pleasant' : 'high_unpleasant';
  return nx >= 0 ? 'low_pleasant' : 'low_unpleasant';
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
