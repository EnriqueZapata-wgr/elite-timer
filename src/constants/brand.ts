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
  card: '#111111',       // Cards, contenedores elevados
  cardLight: '#1A1A1A',  // Bordes, separadores, pista del timer
  border: '#222222',     // Bordes sutiles de cards
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
  error: '#E24B4A',      // Error, crítico, fuera de rango
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
