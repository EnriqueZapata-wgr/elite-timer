/**
 * Sistema de diseño ELITE — Colores, tipografía y espaciado.
 *
 * Todos los componentes importan de aquí en vez de hardcodear valores.
 * Los colores vienen de brand.ts (única fuente de verdad).
 */
import { ATP_BRAND, SURFACES, TEXT_COLORS, BLOCK_COLORS, SEMANTIC } from '@/src/constants/brand';

// === COLORES ===

export const Colors = {
  // Primarios
  black: ATP_BRAND.black,
  neonGreen: ATP_BRAND.lime,

  // Superficies
  surface: SURFACES.card,
  surfaceLight: SURFACES.cardLight,
  surfaceBase: SURFACES.base,
  border: SURFACES.border,

  // Texto
  textPrimary: TEXT_COLORS.primary,
  textSecondary: TEXT_COLORS.secondary,
  textMuted: TEXT_COLORS.muted,
  textOnGreen: TEXT_COLORS.onAccent,

  // Estados
  error: SEMANTIC.error,
  warning: SEMANTIC.warning,
  success: SEMANTIC.success,
  info: SEMANTIC.info,
  disabled: SURFACES.disabled,
} as const;

// === TIPOGRAFÍA ===

export const Fonts = {
  regular: 'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 22,
  xl: 28,
  stat: 24,
  xxl: 48,
  timer: 56,
} as const;

// === ESPACIADO ===

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// === BORDES ===

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 50,
} as const;

// === COLORES POR TIPO DE BLOQUE ===

export const BlockColors = BLOCK_COLORS;

// === ETIQUETAS DE BLOQUES ===

export const BlockTypeLabels: Record<string, string> = {
  exercise: 'Ejercicio',
  rest: 'Descanso',
  transition: 'Transición',
  final: 'Final',
};
