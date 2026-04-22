/**
 * Paleta oficial ATP — Manual de identidad visual (Patricia Aguilar).
 *
 * ÚNICA FUENTE DE VERDAD de colores en toda la app.
 * Ningún archivo debe hardcodear un color; debe importar de aquí.
 */

// ═══ PALETA PRINCIPAL ═══

export const ATP_BRAND = {
  black: '#000000',
  lime: '#A8E02A',       // Lima ELITE — color primario, CTAs, accents
  green1: '#6DCC48',     // Verde intermedio claro
  green2: '#3DBF6E',     // Verde medio
  teal1: '#2EC28A',      // Teal intermedio
  teal2: '#1ABC9C',      // Teal profundo
  white: '#FFFFFF',

  // Gradiente de la molécula (de lima a teal)
  moleculeGradient: ['#A8E02A', '#6DCC48', '#3DBF6E', '#2EC28A', '#1ABC9C'] as const,
} as const;

// ═══ SUPERFICIES ═══

export const SURFACES = {
  base: '#0A0A0A',       // Tab bar, sidebar (casi negro, sutil)
  card: '#0A0A0A',       // Cards, contenedores elevados (unificado con rediseño)
  cardLight: '#1A1A1A',  // Bordes, separadores, pista del timer
  border: '#1A1A1A',     // Bordes sutiles de cards (unificado con rediseño)
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
  screen: '#000',          // fondo de TODA pantalla
  card: '#0a0a0a',         // fondo de TODA card
  cardElevated: '#111',    // card sobre card (raro, evitar)
  input: '#0a0a0a',        // fondo de inputs
} as const;

/** Bordes canonicos */
export const BORDER = {
  card: '#1a1a1a',         // borde de cards — NUNCA usar como bg
  input: '#222',           // borde de inputs
  subtle: '#111',          // separadores internos
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
  bg: '#0a0a0a',
  borderColor: '#1a1a1a',
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
  if (score >= 85) return 'OPTIMO';
  if (score >= 70) return 'CARGADO';
  if (score >= 55) return 'ESTABLE';
  if (score >= 40) return 'BAJO';
  return 'CRITICO';
}

/** Devuelve un mensaje contextual segun score y hora del dia. */
export function getScoreMessage(score: number, hour: number): string {
  if (score >= 85) {
    if (hour < 12) return 'Tu ATP esta al maximo. Hoy es dia de rendir.';
    if (hour < 18) return 'Nivel de energia excepcional. Aprovecha la tarde.';
    return 'Gran dia. Tu cuerpo agradece la consistencia.';
  }
  if (score >= 70) {
    if (hour < 12) return 'Buen nivel de energia. Arranca con todo.';
    if (hour < 18) return 'Manten el ritmo. Vas bien.';
    return 'Dia solido. Preparate para un buen descanso.';
  }
  if (score >= 55) {
    if (hour < 12) return 'Energia moderada. Entrena inteligente, no fuerte.';
    if (hour < 18) return 'Escucha a tu cuerpo. Ajusta la intensidad.';
    return 'Tu sistema pide equilibrio. No exijas de mas.';
  }
  if (score >= 40) {
    if (hour < 12) return 'Tu ATP esta bajo. Prioriza recuperacion hoy.';
    if (hour < 18) return 'Movilidad y descanso activo hoy.';
    return 'Modo recuperacion. Medita y duerme temprano.';
  }
  if (hour < 12) return 'Estado critico. Descanso absoluto hoy.';
  if (hour < 18) return 'Tu cuerpo necesita reset. Nada de entrenar.';
  return 'Prioriza sueno profundo. Manana sera otro dia.';
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
// 3 imagenes en assets/backgrounds/ cubren los 3 momentos del dia.

const BG_IMAGES = {
  sleep:        require('../../assets/backgrounds/bg-sleep.jpg'),
  middayMedium: require('../../assets/backgrounds/bg-midday-medium.jpg'),
  nightLow:     require('../../assets/backgrounds/bg-night-low.jpg'),
} as const;

/** Devuelve la imagen de fondo apropiada segun la hora y el score. */
export function getHoyBackgroundRequire(hour: number, _score: number) {
  if (hour >= 22 || hour < 5) return BG_IMAGES.sleep;
  if (hour < 19) return BG_IMAGES.middayMedium;
  return BG_IMAGES.nightLow;
}
