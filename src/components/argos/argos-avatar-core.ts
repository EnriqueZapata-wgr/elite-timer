/**
 * ARGOS Avatar — lógica pura de los 5 estados dramáticos (T1 MAGIA ARGOS 2.0).
 *
 * Cada estado tiene FORMA y COLOR propios, distinguibles a golpe de vista
 * (feedback Enrique 2026-07-09 — "más visible, con cambio de color y de forma"):
 *
 *   offline     → bullseye estático (3 círculos concéntricos), gris tenue
 *   idle        → círculos concéntricos "alive" (respiración desfasada), lima
 *   thinking    → olas en movimiento (barras senoidales fluyendo), azul
 *   speaking    → estrella 5 puntas pulsante + rayos radiales, lima brillante
 *   unavailable → tache X (dos líneas cruzadas), rojo tenue
 *
 * Separada del componente para testear el mapeo estado→spec y la geometría
 * SVG sin renderizar RN (convención del repo: lógica pura en *-core.ts).
 *
 * NOTA COLORES: espejo de src/constants/brand.ts (lime/info/error). No se
 * importa brand.ts aquí porque arrastra require() de imágenes y rompería el
 * harness Vitest node-only. Si brand cambia, actualizar aquí.
 */

export type ArgosAvatarState = 'offline' | 'idle' | 'thinking' | 'speaking' | 'unavailable';
export type ArgosAvatarVariant = 'compact' | 'full';

export const AVATAR_STATES: readonly ArgosAvatarState[] = [
  'offline', 'idle', 'thinking', 'speaking', 'unavailable',
] as const;

/** Forma dominante que dibuja cada estado. */
export type AvatarShape = 'bullseye' | 'rings' | 'waves' | 'star' | 'cross';

export interface AvatarStateSpec {
  shape: AvatarShape;
  /** Color principal de la forma (stroke/fill). */
  color: string;
  /** Color del halo de fondo. */
  glowColor: string;
  /** Opacidad mín/máx del halo (halo estático si min === max). */
  glowMin: number;
  glowMax: number;
  /** Duración de medio ciclo de la animación base, ms. */
  cycleMs: number;
  /** false = estado completamente estático (offline). */
  animated: boolean;
}

// Espejo de brand.ts — ver nota del encabezado.
const LIME = '#A8E02A';
const LIME_BRIGHT = '#C6F94B'; // lima brillante para speaking (más luz que el base)
const BLUE = '#5B9BD5';        // SEMANTIC.info / CATEGORY_COLORS.nutrition
const RED = '#fb7185';         // SEMANTIC.error
const GRAY = '#555555';        // TEXT_COLORS.muted

/** Duración del crossfade entre estados (spec: 200-400ms). */
export const STATE_TRANSITION_MS = 280;

/**
 * Mapeo estado → spec visual. Cambio de FORMA + COLOR por estado — el
 * requisito central del rediseño (v1 era "demasiado sutil, casi igual").
 */
export function avatarSpecForState(state: ArgosAvatarState): AvatarStateSpec {
  switch (state) {
    case 'offline':
      return { shape: 'bullseye', color: GRAY, glowColor: GRAY, glowMin: 0.06, glowMax: 0.06, cycleMs: 0, animated: false };
    case 'thinking':
      return { shape: 'waves', color: BLUE, glowColor: BLUE, glowMin: 0.22, glowMax: 0.5, cycleMs: 520, animated: true };
    case 'speaking':
      return { shape: 'star', color: LIME_BRIGHT, glowColor: LIME, glowMin: 0.35, glowMax: 0.75, cycleMs: 420, animated: true };
    case 'unavailable':
      return { shape: 'cross', color: RED, glowColor: RED, glowMin: 0.12, glowMax: 0.22, cycleMs: 1400, animated: true };
    case 'idle':
    default:
      return { shape: 'rings', color: LIME, glowColor: LIME, glowMin: 0.14, glowMax: 0.34, cycleMs: 1500, animated: true };
  }
}

/** Coerción defensiva: cualquier valor desconocido cae a 'idle'. */
export function normalizeAvatarState(state: unknown): ArgosAvatarState {
  return (AVATAR_STATES as readonly unknown[]).includes(state)
    ? (state as ArgosAvatarState)
    : 'idle';
}

/** Clamp de tamaño para no romper layout (avatar entre 20 y 200 px). */
export function clampAvatarSize(size: number): number {
  if (!Number.isFinite(size)) return 40;
  return Math.max(20, Math.min(200, size));
}

// ─── GEOMETRÍA ──────────────────────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Radios de los círculos concéntricos (bullseye/rings) en proporción áurea:
 * r, r/φ, r/φ², … De mayor a menor.
 */
export function ringRadii(outerRadius: number, count = 3): number[] {
  const radii: number[] = [];
  for (let i = 0; i < count; i++) {
    radii.push(outerRadius / Math.pow(PHI, i));
  }
  return radii;
}

/** Número de barras de la ola de "thinking" según variante (impar = simétrica). */
export function barCountForVariant(variant: ArgosAvatarVariant): number {
  return variant === 'full' ? 7 : 5;
}

/**
 * Retraso escalonado (ms) de cada barra para que la ola fluya (no late al
 * unísono). Determinista: barra i entra `i * step` ms después.
 */
export function barDelay(index: number, step = 90): number {
  return index * step;
}

/**
 * Alturas senoidales de la ola en una fase dada (0..2π). Determinista y pura
 * — describe la forma de la ola que el componente aproxima con timings
 * escalonados. `min`/`max` en fracción de la altura total (0..1).
 */
export function waveHeights(phase: number, count: number, min = 0.3, max = 1): number[] {
  const heights: number[] = [];
  const span = max - min;
  for (let i = 0; i < count; i++) {
    const offset = (i / Math.max(1, count - 1)) * Math.PI;
    heights.push(min + span * (0.5 + 0.5 * Math.sin(phase + offset)));
  }
  return heights;
}

/**
 * Path SVG de una estrella de `points` puntas centrada en (cx, cy).
 * Punta superior a -90°. innerRadius controla qué tan "afilada" es.
 */
export function starPath(cx: number, cy: number, outerRadius: number, innerRadius: number, points = 5): string {
  const steps: string[] = [];
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    steps.push(`${i === 0 ? 'M' : 'L'}${round2(x)},${round2(y)}`);
  }
  return steps.join(' ') + ' Z';
}

export interface Line {
  x1: number; y1: number; x2: number; y2: number;
}

/** Las dos líneas a 45° del tache X (unavailable), dentro de radio r. */
export function crossLines(cx: number, cy: number, r: number): [Line, Line] {
  const d = round2(r * Math.SQRT1_2);
  return [
    { x1: round2(cx - d), y1: round2(cy - d), x2: round2(cx + d), y2: round2(cy + d) },
    { x1: round2(cx - d), y1: round2(cy + d), x2: round2(cx + d), y2: round2(cy - d) },
  ];
}

/**
 * Rayos radiales de "speaking": `count` segmentos desde radio interior a
 * exterior, distribuidos uniformemente empezando arriba (-90°).
 */
export function rayLines(cx: number, cy: number, innerR: number, outerR: number, count = 8): Line[] {
  const lines: Line[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    lines.push({
      x1: round2(cx + innerR * Math.cos(angle)),
      y1: round2(cy + innerR * Math.sin(angle)),
      x2: round2(cx + outerR * Math.cos(angle)),
      y2: round2(cy + outerR * Math.sin(angle)),
    });
  }
  return lines;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
