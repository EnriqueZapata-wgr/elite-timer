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
//
// MB-9 · Track A: el plano pasa de rejilla 2D a CIRCUMPLEJO POLAR (Russell 1980).
// El mundo es CUADRADO y el disco de emociones se inscribe centrado. El centro
// es la CALMA (destino, no hueco). El ángulo = cualidad (cuadrante + energía),
// el radio = intensidad. La huella de la solución anti-colisión es una espiral.

/** Lado del mundo (cuadrado: el disco polar necesita ejes iguales). */
export const WORLD_SIZE = 2800;
/** Ancho del mundo — igual al alto (compat: la cámara lee WORLD_W/WORLD_H). */
export const WORLD_W = WORLD_SIZE;
/** Alto del mundo. */
export const WORLD_H = WORLD_SIZE;
/** Margen interno — el disco no se pega al borde físico del mundo. */
export const WORLD_PAD = 100;
/** Centro del disco (la CALMA vive aquí). */
export const CENTER_X = WORLD_SIZE / 2;
export const CENTER_Y = WORLD_SIZE / 2;

/** Radio interior: por dentro vive la zona CALMA, ninguna burbuja entra. */
export const CALM_R0 = 340;
/** Radio del anillo de máxima intensidad (deja aire para la burbuja + el borde). */
export const OUTER_R = 1300;
/** Ancho radial de la banda de una intensidad (1 de 10). Ver radiusForIntensity. */
export const RING_BAND = (OUTER_R - CALM_R0) / 9;

/** Diámetro de referencia (labels/culling/atomo lo usan como base). */
export const NODE_SIZE = 96;
/** Diámetro mínimo (intensidad 1, cerca del centro: menos espacio → más chico). */
export const NODE_MIN = 54;
/** Diámetro máximo (intensidad 10, en el borde). */
export const NODE_MAX = 112;
/** Aire mínimo entre bordes de dos burbujas tras resolver colisiones. */
export const NODE_GAP = 14;
/** Separación de referencia centro-a-centro (compat con imports antiguos). */
export const MIN_SEP = NODE_SIZE + NODE_GAP;

/** Sectores angulares por cuadrante (grados, convención matemática CCW desde +x).
 *  hp arriba-derecha · hu arriba-izq · lu abajo-izq · lp abajo-derecha. Gaps de
 *  6° entre sectores evitan que dos cuadrantes se toquen en el borde. */
export const QUADRANT_SECTORS: Record<QuadrantKey, [number, number]> = {
  high_pleasant: [3, 87],
  high_unpleasant: [93, 177],
  low_unpleasant: [183, 267],
  low_pleasant: [273, 357],
};

/** Diámetro de la burbuja según intensidad (1..10 → NODE_MIN..NODE_MAX). */
export function nodeSizeForIntensity(intensity: number): number {
  const t = Math.max(0, Math.min(1, (intensity - 1) / 9));
  return NODE_MIN + t * (NODE_MAX - NODE_MIN);
}

/** Radio base del anillo de una intensidad (centro=calma R0, borde=pico R1). */
export function radiusForIntensity(intensity: number): number {
  const t = Math.max(0, Math.min(1, (intensity - 1) / 9));
  return CALM_R0 + t * (OUTER_R - CALM_R0);
}

/** Rangos de energía por cuadrante (para mapear energía → ángulo dentro del sector). */
const ENERGY_RANGE: Record<QuadrantKey, [number, number]> = {
  high_pleasant: [5, 10],
  high_unpleasant: [5, 10],
  low_pleasant: [1, 5],
  low_unpleasant: [1, 5],
};

/**
 * Ángulo semántico (grados) de una emoción dentro de su sector: la energía
 * manda la verticalidad (activación alta → cerca del eje vertical superior;
 * baja → cerca del inferior), consistente con el circumplejo de Russell.
 */
export function angleForEmotion(quadrant: QuadrantKey, energy: number): number {
  const [lo, hi] = QUADRANT_SECTORS[quadrant];
  const [eLo, eHi] = ENERGY_RANGE[quadrant];
  const t = Math.max(0, Math.min(1, (energy - eLo) / (eHi - eLo)));
  switch (quadrant) {
    // hp: 87°≈vertical(arriba). Más energía → ángulo mayor (más arriba).
    case 'high_pleasant': return lo + t * (hi - lo);
    // hu: 93°≈vertical(arriba). Más energía → ángulo menor (más cerca de 93).
    case 'high_unpleasant': return hi - t * (hi - lo);
    // lu: 267°≈vertical(abajo). Menos energía → más abajo (cerca de 267).
    case 'low_unpleasant': return lo + (1 - t) * (hi - lo);
    // lp: 273°≈vertical(abajo). Menos energía → más abajo (cerca de 273).
    case 'low_pleasant': return lo + t * (hi - lo);
  }
}

/** Polar (ángulo en grados, radio en px) → mundo. y de pantalla crece hacia abajo. */
export function polarToWorld(angleDeg: number, r: number): { wx: number; wy: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { wx: CENTER_X + r * Math.cos(a), wy: CENTER_Y - r * Math.sin(a) };
}

/** Posición final de una emoción en el mundo. */
export interface EmotionMapPoint {
  id: string;
  /** Coordenadas de COLOR (−1…+1): valencia (x) y activación (y). NO es el layout. */
  nx: number;
  ny: number;
  /** Posición final en px de mundo (polar + anti-colisión). */
  wx: number;
  wy: number;
  /** Diámetro de la burbuja (escala con intensidad). */
  size: number;
  /** Radio final desde el centro (px). Monótono no-decreciente con la intensidad. */
  radius: number;
  /** true → landmark visible en vista alejada (LOD). El resto se revela al acercar. */
  representative: boolean;
  /** Empuje radial (px) que la espiral aplicó sobre el radio base (0 = sin desborde). */
  displaced: number;
}

/** Grupo de emociones que caían EXACTAMENTE en la misma posición polar base. */
export interface OverlapGroup {
  /** Coordenada de color compartida. */
  nx: number;
  ny: number;
  /** Ids en el orden determinista en que se repartieron. */
  ids: string[];
}

export interface EmotionMapLayout {
  points: EmotionMapPoint[];
  /** Reporte para revisión humana: colisiones base que el resolver separó. */
  overlaps: OverlapGroup[];
  /** Ids que la espiral empujó a otro anillo (revisión: ¿siguen en su banda?). */
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

/** Empuje radial por desborde (px). Es lo que dibuja la ESPIRAL: cuando un
 *  anillo se agota, la emoción salta al siguiente sin cambiar de cualidad. */
const SPIRAL_PUSH = 6;

/**
 * Landmarks visibles en vista alejada (LOD · A.4). Curados: reconocibles y
 * repartidos por cuadrante e intensidad, para que el primer render no sean 144
 * burbujas con degradado (bonus de perf en gama media). El resto se revela al
 * acercarse, como en cualquier mapa.
 */
export const REPRESENTATIVE_IDS = new Set<string>([
  // alta·agradable
  'ecstatic', 'motivated', 'happy', 'grateful', 'curious',
  // alta·desagradable
  'enraged', 'angry', 'anxious', 'stressed', 'annoyed',
  // baja·desagradable
  'depressed', 'sad', 'lonely', 'tired', 'bored',
  // baja·agradable
  'calm', 'peaceful', 'content', 'relaxed', 'safe',
]);

/**
 * Punto de aterrizaje de la cámara para un cuadrante: centro visual del sector
 * (ángulo medio, radio medio). La navegación y el aterrizaje inicial viven de
 * esto — NO de QUADRANT_CENTERS, que es espacio de color, no de layout.
 */
export function quadrantLandingWorld(q: QuadrantKey): { wx: number; wy: number } {
  const [lo, hi] = QUADRANT_SECTORS[q];
  const midAngle = (lo + hi) / 2;
  const midRadius = CALM_R0 + 0.55 * (OUTER_R - CALM_R0);
  return polarToWorld(midAngle, midRadius);
}

/**
 * Layout determinista del circumplejo polar (MB-9 · Track A).
 *
 * Regla madre (A.2): **el radio es sagrado, el ángulo es flexible.** La
 * intensidad fija el anillo (eje de navegación) y no se mueve; la cualidad
 * (ángulo) puede deslizarse unos grados dentro de su sector.
 *
 * 1. Orden de trabajo por intensidad ascendente (radio asc) → deja los anillos
 *    interiores puestos antes de resolver los de afuera.
 * 2. Para cada emoción: radio = intensidad, ángulo semántico = energía. Si el
 *    ángulo choca contra algo ya puesto, se desliza sobre el MISMO anillo,
 *    alternando ±, en pasos proporcionales a (diámetro+gap)/circunferencia.
 * 3. Si el anillo se agota, el radio empuja +SPIRAL_PUSH y reintenta — dentro
 *    de la BANDA de su intensidad, nunca invadiendo la del vecino. Ese empuje
 *    es la espiral, y garantiza monotonía estricta de radio contra intensidad.
 * 4. Colisión GLOBAL (no solo por sector): dos emociones de cuadrantes vecinos
 *    que se rozan en el borde interno se separan por radio, nunca cruzando de
 *    cuadrante (el ángulo está clavado a su sector).
 *
 * Sin Math.random: mismo input ⇒ mismo mapa, siempre.
 */
export function computeEmotionMapLayout(emotions: Emotion[]): EmotionMapLayout {
  // Radio sagrado primero (intensidad asc), luego energía, luego id: determinista.
  const sorted = [...emotions].sort((a, b) => {
    if (a.intensity !== b.intensity) return a.intensity - b.intensity;
    if (a.energy !== b.energy) return a.energy - b.energy;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  interface Placed {
    id: string; nx: number; ny: number;
    wx: number; wy: number; size: number;
    radius: number; displaced: number;
  }
  const placed: Placed[] = [];
  const overlapMap = new Map<string, { nx: number; ny: number; ids: string[] }>();

  for (const e of sorted) {
    const nx = normX(e.quadrant, e.intensity);
    const ny = normY(e.energy);
    const size = nodeSizeForIntensity(e.intensity);
    const baseAngle = angleForEmotion(e.quadrant, e.energy);
    const baseRadius = radiusForIntensity(e.intensity);
    const [secLo, secHi] = QUADRANT_SECTORS[e.quadrant];
    // La banda de esta intensidad: el desborde NUNCA la cruza (monotonía).
    const maxRadius = baseRadius + RING_BAND * 0.85;

    // Reporte de solapes base (misma posición polar exacta).
    const key = `${e.quadrant}|${baseAngle.toFixed(3)}|${baseRadius.toFixed(3)}`;
    const grp = overlapMap.get(key);
    if (grp) grp.ids.push(e.id);
    else overlapMap.set(key, { nx, ny, ids: [e.id] });

    let chosen: { radius: number; wx: number; wy: number } | null = null;
    let r = baseRadius;
    while (!chosen && r <= maxRadius + 1e-6) {
      // Paso angular ~ (diámetro + gap) / circunferencia, en grados.
      const stepDeg = ((size + NODE_GAP) / r) * (180 / Math.PI);
      const maxK = Math.ceil((secHi - secLo) / stepDeg) + 2;
      // Candidatos: ángulo semántico, luego +paso, −paso, +2paso, −2paso, …
      for (let k = 0; k <= maxK && !chosen; k++) {
        const offsets = k === 0 ? [0] : [k * stepDeg, -k * stepDeg];
        for (const off of offsets) {
          const ang = baseAngle + off;
          if (ang < secLo || ang > secHi) continue;
          const { wx, wy } = polarToWorld(ang, r);
          const collides = placed.some((p) =>
            Math.hypot(wx - p.wx, wy - p.wy) < (size + p.size) / 2 + NODE_GAP);
          if (!collides) { chosen = { radius: r, wx, wy }; break; }
        }
      }
      if (!chosen) r += SPIRAL_PUSH;
    }
    if (!chosen) {
      // Fallback determinista (raro): si la banda se saturó, elegimos el ángulo
      // del sector, al tope de banda, que MAXIMIZA la distancia a lo ya puesto —
      // el hueco menos malo, nunca un apilamiento. Barrido fino y determinista.
      let bestAng = baseAngle;
      let bestGap = -Infinity;
      for (let ang = secLo; ang <= secHi; ang += 0.5) {
        const { wx, wy } = polarToWorld(ang, maxRadius);
        let minGap = Infinity;
        for (const p of placed) {
          const gap = Math.hypot(wx - p.wx, wy - p.wy) - ((size + p.size) / 2);
          if (gap < minGap) minGap = gap;
        }
        if (minGap > bestGap) { bestGap = minGap; bestAng = ang; }
      }
      const { wx, wy } = polarToWorld(bestAng, maxRadius);
      chosen = { radius: maxRadius, wx, wy };
    }

    placed.push({
      id: e.id, nx, ny, wx: chosen.wx, wy: chosen.wy, size,
      radius: chosen.radius, displaced: chosen.radius - baseRadius,
    });
  }

  const overlaps: OverlapGroup[] = [];
  for (const { nx, ny, ids } of overlapMap.values()) {
    if (ids.length < 2) continue;
    overlaps.push({ nx, ny, ids: [...ids].sort() });
  }
  overlaps.sort((a, b) => (a.ids[0] < b.ids[0] ? -1 : 1));

  const bigMoves = placed.filter((p) => p.displaced > 0.5).map((p) => p.id).sort();

  return {
    points: placed
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((p) => ({
        id: p.id, nx: p.nx, ny: p.ny, wx: p.wx, wy: p.wy,
        size: p.size, radius: p.radius,
        representative: REPRESENTATIVE_IDS.has(p.id),
        displaced: p.displaced,
      })),
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

// ═══ CULLING POR VIEWPORT (MB-4.1 · Bloque C — plan B de perf) ═══
//
// 144 gradientes simultáneos en un Android de gama media es el riesgo #1. Solo
// renderizamos lo que cae en el viewport (+ margen), y en vista alejada el nodo
// se dibuja como color plano (sin LinearGradient). Estos helpers son PUROS para
// poder testear la matemática sin montar la vista.

export interface WorldBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Rectángulo del MUNDO visible dado el estado de cámara. transformOrigin es
 * top-left: un punto (wx,wy) aparece en pantalla en (tx + wx·scale, ty + wy·scale).
 * Despejando, el mundo visible es [−tx/s, (vpW−tx)/s] × [−ty/s, (vpH−ty)/s].
 * Se expande con `marginPx` (en px de MUNDO) para que deslizar no haga pop-in.
 */
export function visibleWorldBox(
  viewportW: number,
  viewportH: number,
  tx: number,
  ty: number,
  scale: number,
  marginPx: number = NODE_SIZE * 3,
): WorldBox {
  const s = scale > 0.0001 ? scale : 0.0001;
  return {
    minX: -tx / s - marginPx,
    maxX: (viewportW - tx) / s + marginPx,
    minY: -ty / s - marginPx,
    maxY: (viewportH - ty) / s + marginPx,
  };
}

/** ¿El centro de un nodo cae dentro (o en el margen) de la caja visible? */
export function isInWorldBox(wx: number, wy: number, box: WorldBox): boolean {
  return wx >= box.minX && wx <= box.maxX && wy >= box.minY && wy <= box.maxY;
}

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
