/**
 * Sistema de diseño ELITE — Colores, tipografía y espaciado.
 *
 * Todos los componentes importan de aquí en vez de hardcodear valores.
 * Así un cambio de color o fuente se refleja en toda la app.
 */

// === COLORES ===

export const Colors = {
  // Primarios
  black: '#000000',           // Fondo principal
  neonGreen: '#a8e02a',       // Color de acento — botones, progreso, texto destacado

  // Superficies — variaciones de gris oscuro para crear profundidad
  surface: '#111111',         // Cards, contenedores elevados
  surfaceLight: '#1a1a1a',    // Bordes, separadores, pista del timer

  // Texto
  textPrimary: '#ffffff',     // Texto principal sobre fondo negro
  textSecondary: '#888888',   // Texto secundario, hints, labels inactivos
  textOnGreen: '#000000',     // Texto sobre fondo verde neón (botones)

  // Estados
  error: '#ff4444',           // Errores, alertas
  disabled: '#333333',        // Elementos deshabilitados
} as const;

// === TIPOGRAFÍA ===

// Nombres de las fuentes tal como se registran en expo-font.
// Estos strings se usan en fontFamily de los estilos.
export const Fonts = {
  regular: 'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
} as const;

// Tamaños de texto predefinidos para mantener consistencia visual.
// Cada nivel tiene un uso específico en la app.
export const FontSizes = {
  xs: 12,        // Captions, badges
  sm: 14,        // Chips, labels secundarios
  md: 16,        // Texto de cuerpo, botones secundarios
  lg: 20,        // Botones principales, subtítulos
  xl: 28,        // Títulos de pantalla
  xxl: 48,       // Timer (números grandes)
  timer: 64,     // Timer principal (el más grande)
} as const;

// === ESPACIADO ===

// Múltiplos de 4px para un ritmo visual consistente.
// Evita "magic numbers" dispersos en los estilos.
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
  sm: 8,         // Inputs, chips pequeños
  md: 16,        // Cards, contenedores
  lg: 24,        // Chips grandes
  pill: 50,      // Botones pill (completamente redondos)
} as const;
