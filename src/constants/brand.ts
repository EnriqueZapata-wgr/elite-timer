/**
 * Paleta oficial ATP — Manual de identidad visual (Patricia Aguilar).
 *
 * ÚNICA FUENTE DE VERDAD de colores en toda la app.
 * Ningún archivo debe hardcodear un color; debe importar de aquí.
 */
import { hoyBgBucket } from '@/src/utils/time-of-day';

// ═══ PALETA PRINCIPAL ═══

export const ATP_BRAND = {
  black: '#000000',
  lime: '#A8E02A',       // Lima ELITE — color primario, CTAs, accents
  green1: '#6DCC48',     // Verde intermedio claro
  green2: '#3DBF6E',     // Verde medio
  teal1: '#2EC28A',      // Teal intermedio
  teal2: '#1ABC9C',      // Teal profundo
  teal: '#1ABC9C',       // Teal de acento (= el más bajo del molecule gradient) — acentos auth/UI
  white: '#FFFFFF',

  // Gradiente de la molécula (de lima a teal)
  moleculeGradient: ['#A8E02A', '#6DCC48', '#3DBF6E', '#2EC28A', '#1ABC9C'] as const,
} as const;

// ═══ ENLACES EXTERNOS ═══
// Bridge a la comunidad humana (Skool). Único canal de conversación humana —
// in-app NO hay chat privado (doctrina cerrada). Configurable post-launch:
// cambiará a skool.com/tribu-atp (o plan premium) cuando haya presupuesto.
export const SKOOL_URL = 'https://www.skool.com/the-vital-order-7560/about';

// ═══ SUPERFICIES ═══

export const SURFACES = {
  base: '#0A0A0A',       // Tab bar, sidebar (casi negro, sutil)
  card: '#121212',       // Cards = ELEVATION[1] (unificado viejo+nuevo, se despega del negro)
  cardLight: '#1A1A1A',  // Bordes, separadores, pista del timer
  border: '#1F1F1F',     // Bordes sutiles de cards = ELEVATION[1].border
  disabled: '#333333',   // Elementos deshabilitados
} as const;

// ═══ TEXTO ═══

export const TEXT_COLORS = {
  primary: '#FFFFFF',    // Texto principal sobre fondo negro
  secondary: '#888888',  // Texto secundario, hints, labels inactivos
  muted: '#555555',      // Tab inactivo, texto muy tenue
  onAccent: '#000000',   // Texto sobre fondo lima (botones primarios)
} as const;

// ═══ COLORES POR CATEGORÍA ═══

export const CATEGORY_COLORS = {
  fitness: '#A8E02A',    // Lima
  nutrition: '#5B9BD5',  // Azul
  mind: '#7F77DD',       // Morado
  optimization: '#EF9F27', // Amber
  metrics: '#1D9E75',    // Teal
  rest: '#E0E0E0',       // Gris
} as const;

// ═══ COLORES SEMÁNTICOS ═══

export const SEMANTIC = {
  success: '#A8E02A',    // Éxito, óptimo
  acceptable: '#EFD54F', // Aceptable, en rango
  warning: '#EF9F27',    // Advertencia, riesgo
  error: '#fb7185',      // Error/crítico — rose-400, legible en fondo oscuro
  info: '#5B9BD5',       // Información
  noData: '#444444',     // Sin datos
} as const;

// ═══ COLORES POR TIPO DE BLOQUE (TIMER) ═══

export const BLOCK_COLORS = {
  exercise: '#A8E02A',   // Verde neón — acción principal
  rest: '#4A90D9',       // Azul calmante — descanso
  transition: '#F5A623', // Naranja — transición / atención
  final: '#E74C3C',      // Rojo — bloque final
} as const;

// ═══ ESTILOS DE CARDS ═══

export const CARD_STYLE = {
  background: SURFACES.card,
  borderColor: SURFACES.border,
  borderWidth: 0.5,
  borderRadius: 12,
  categoryBorderWidth: 3, // Borde izquierdo en cards con categoría
} as const;

// ═══ ESTILOS DE BOTONES ═══

export const BUTTON_STYLES = {
  primary: {
    background: ATP_BRAND.lime,
    text: TEXT_COLORS.onAccent,
    borderRadius: 8,
  },
  secondary: {
    background: 'transparent',
    borderColor: ATP_BRAND.lime,
    borderWidth: 1,
    text: ATP_BRAND.lime,
    borderRadius: 8,
  },
  danger: {
    background: 'transparent',
    borderColor: SEMANTIC.error,
    borderWidth: 1,
    text: SEMANTIC.error,
    borderRadius: 8,
  },
} as const;

// ═══ UTILIDADES ═══

/** Helper para aplicar opacidad a un color hex sin string concat */
export function withOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + alpha;
}

// ═══════════════════════════════════════════════════════════════════
// TOKENS CANONICOS DEL DESIGN SYSTEM (unica fuente de verdad)
// ═══════════════════════════════════════════════════════════════════
// Estos son los tokens nuevos. Los SURFACES/TEXT_COLORS de arriba se
// mantienen como aliases pero todo codigo nuevo debe usar BG/BORDER/TEXT.

/** Backgrounds canonicos */
export const BG = {
  screen: '#000',          // fondo de TODA pantalla = ELEVATION[0]
  card: '#121212',         // fondo de TODA card = ELEVATION[1] (se despega del negro)
  cardElevated: '#1A1A1A', // card sobre card = ELEVATION[2]
  input: '#0a0a0a',        // fondo de inputs (recedido, contrasta con la card)
} as const;

/** Bordes canonicos */
export const BORDER = {
  card: '#1F1F1F',         // borde de cards = ELEVATION[1].border — NUNCA usar como bg
  input: '#222',           // borde de inputs
  subtle: '#141414',       // separadores internos
} as const;

/** Texto canonico */
export const TEXT = {
  primary: '#fff',
  secondary: '#888',
  tertiary: '#555',
  muted: '#444',
  accent: '#a8e02a',
} as const;

/** Estilo unico de Section Title */
export const SECTION_TITLE = {
  fontSize: 11,
  letterSpacing: 2,
  fontWeight: '600' as const,
  color: '#888',
  textTransform: 'uppercase' as const,
  marginBottom: 12,
} as const;

/** Estilo unico de Filter/Tab Pill */
export const PILL = {
  height: 34,
  paddingHorizontal: 16,
  borderRadius: 17,
  borderWidth: 0.5,
  bg: '#0a0a0a',
  borderColor: '#1a1a1a',
  activeBg: '#a8e02a',
  activeBorderColor: '#a8e02a',
  textColor: '#666',
  activeTextColor: '#000',
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 1,
} as const;

/** Estilo unico de Card */
export const CARD = {
  bg: '#121212',           // = ELEVATION[1] (se despega del negro)
  borderColor: '#1F1F1F',
  borderWidth: 0.5,
  borderRadius: 16,
  padding: 16,
} as const;

/** Spacing entre secciones */
export const SECTION_SPACING = {
  sm: 16,    // entre cards del mismo grupo
  md: 24,    // entre secciones
  lg: 32,    // entre grupos grandes
} as const;

/** Escala de letterSpacing */
export const LETTER_SPACING = {
  tight: 0.5,    // textos de parrafo
  normal: 1,     // labels normales
  wide: 2,       // section titles, headers
  xwide: 3,      // solo "ATP" en logo
} as const;

// ═══════════════════════════════════════════════════════════════════
// ELEVACION + GLOW + ROLES DE ACENTO  (Fase 1 — rediseño UI/UX)
// ═══════════════════════════════════════════════════════════════════
// Objetivo: dar PROFUNDIDAD real (las cards a #0a0a0a casi no se separan
// del fondo negro) y RESTRICCION de acento. Codigo nuevo debe elegir un
// nivel de ELEVATION en vez de hardcodear bg/borde, y reservar GLOW para
// UN solo elemento heroico por pantalla.

/**
 * Escala de superficies por nivel de elevacion (dark mode).
 * Cada nivel sube luminancia + borde para que el ojo lea profundidad.
 *   0 = fondo de pantalla   1 = card estandar
 *   2 = card sobre card / sheet / modal   3 = popover / menu flotante
 */
export const ELEVATION = {
  0: { bg: '#000000', border: 'transparent' },
  1: { bg: '#121212', border: '#1F1F1F' }, // card estandar — se despega del negro
  2: { bg: '#1A1A1A', border: '#2A2A2A' }, // card sobre card / sheet / modal
  3: { bg: '#222222', border: '#323232' }, // popover / menu flotante
} as const;

/**
 * Glow para el elemento HEROICO de cada pantalla (dato/CTA protagonista).
 * Regla: maximo 1 uso por vista. Lima por defecto; usar `withGlow(color)`
 * para halos por categoria.
 */
export const GLOW = {
  accent: {
    shadowColor: ATP_BRAND.lime,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12, // Android
  },
} as const;

/** Halo a partir de un color de categoria (mismo perfil que GLOW.accent). */
export function withGlow(color: string) {
  return {
    shadowColor: color,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  } as const;
}

/**
 * ROLES DE ACENTO — disciplina de color (causa raiz del "no wow": el lima
 * esta en TODO). Heuristica: si en una pantalla cuentas >3 elementos lima,
 * sobra acento.
 *   primary  → accion primaria + dato heroico (max 1-2 por vista) → lima
 *   neutral  → todo lo tactil secundario → TEXT.secondary / BORDER.card
 *   category → tinte/icono por pilar, SIEMPRE desaturado (no a tope)
 */
export const ACCENT_ROLES = {
  primary: ATP_BRAND.lime,
  neutral: TEXT_COLORS.secondary,
} as const;

// ═══════════════════════════════════════════════════════════════════
// PREMIUM DESIGN TOKENS — colores semanticos, gradients, mensajes
// ═══════════════════════════════════════════════════════════════════

/** Colores semanticos por nivel de score (0-100) */
export const SCORE_COLORS = {
  optimal:  '#4ade80',   // 85+ verde brillante
  charged:  '#a8e02a',   // 70-84 lime ATP
  stable:   '#fbbf24',   // 55-69 amarillo
  low:      '#f97316',   // 40-54 naranja
  critical: '#ef4444',   // 0-39 rojo
} as const;

/** Devuelve el color asociado a un score (0-100). */
export function getScoreColor(score: number): string {
  if (score >= 85) return SCORE_COLORS.optimal;
  if (score >= 70) return SCORE_COLORS.charged;
  if (score >= 55) return SCORE_COLORS.stable;
  if (score >= 40) return SCORE_COLORS.low;
  return SCORE_COLORS.critical;
}

/** Devuelve la etiqueta de nivel para un score. */
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'ÓPTIMO';
  if (score >= 70) return 'CARGADO';
  if (score >= 55) return 'ESTABLE';
  if (score >= 40) return 'BAJO';
  return 'CRÍTICO';
}

/** Devuelve un mensaje contextual según score y hora del día. */
export function getScoreMessage(score: number, hour: number): string {
  if (score >= 85) {
    if (hour < 12) return 'Tu ATP está al máximo. Hoy es día de rendir.';
    if (hour < 18) return 'Nivel de energía excepcional. Aprovecha la tarde.';
    return 'Gran día. Tu cuerpo agradece la consistencia.';
  }
  if (score >= 70) {
    if (hour < 12) return 'Buen nivel de energía. Arranca con todo.';
    if (hour < 18) return 'Mantén el ritmo. Vas bien.';
    return 'Día sólido. Prepárate para un buen descanso.';
  }
  if (score >= 55) {
    if (hour < 12) return 'Energía moderada. Entrena inteligente, no fuerte.';
    if (hour < 18) return 'Escucha a tu cuerpo. Ajusta la intensidad.';
    return 'Tu sistema pide equilibrio. No exijas de más.';
  }
  if (score >= 40) {
    if (hour < 12) return 'Tu ATP está bajo. Prioriza recuperación hoy.';
    if (hour < 18) return 'Movilidad y descanso activo hoy.';
    return 'Modo recuperación. Medita y duerme temprano.';
  }
  if (hour < 12) return 'Estado crítico. Descanso absoluto hoy.';
  if (hour < 18) return 'Tu cuerpo necesita reset. Nada de entrenar.';
  return 'Prioriza sueño profundo. Mañana será otro día.';
}

/** Gradientes por pilar/categoria — start (color tinted) -> end (oscuro). */
export const PILLAR_GRADIENTS = {
  fitness:    { start: 'rgba(168,224,42,0.25)', end: 'rgba(10,10,10,0.95)' },
  nutrition:  { start: 'rgba(91,155,213,0.25)', end: 'rgba(10,10,10,0.95)' },
  mind:       { start: 'rgba(127,119,221,0.25)', end: 'rgba(10,10,10,0.95)' },
  health:     { start: 'rgba(29,158,117,0.25)', end: 'rgba(10,10,10,0.95)' },
  cycle:      { start: 'rgba(212,83,126,0.25)', end: 'rgba(10,10,10,0.95)' },
  metrics:    { start: 'rgba(29,158,117,0.25)', end: 'rgba(10,10,10,0.95)' },
  sleep:      { start: 'rgba(91,155,213,0.20)', end: 'rgba(10,10,10,0.95)' },
  recovery:   { start: 'rgba(78,170,128,0.20)', end: 'rgba(10,10,10,0.95)' },
  stress:     { start: 'rgba(239,159,39,0.20)', end: 'rgba(10,10,10,0.95)' },
  activity:   { start: 'rgba(168,224,42,0.20)', end: 'rgba(10,10,10,0.95)' },
  protocol:   { start: 'rgba(239,159,39,0.20)', end: 'rgba(10,10,10,0.95)' },
} as const;

// ═══════════════════════════════════════════════════════════════════
// HOY BACKGROUNDS — Imagenes de fondo dinamicas por hora
// ═══════════════════════════════════════════════════════════════════
// requires estaticos (Metro bundler los analiza en tiempo de compilacion).
// 4 imagenes en assets/backgrounds/ cubren los 4 momentos del dia.

const BG_IMAGES = {
  sleep:        require('../../assets/backgrounds/bg-sleep.jpg'),
  morning:      require('../../assets/backgrounds/bg-morning.jpg'),
  middayMedium: require('../../assets/backgrounds/bg-midday-medium.jpg'),
  nightLow:     require('../../assets/backgrounds/bg-night-low.jpg'),
} as const;

/** Devuelve la imagen de fondo apropiada segun la hora (franja pura en time-of-day). */
export function getHoyBackgroundRequire(hour: number, _score: number) {
  switch (hoyBgBucket(hour)) {
    case 'sleep': return BG_IMAGES.sleep;
    case 'morning': return BG_IMAGES.morning;
    case 'midday': return BG_IMAGES.middayMedium;
    default: return BG_IMAGES.nightLow;
  }
}
