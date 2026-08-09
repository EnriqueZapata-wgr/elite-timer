/**
 * Paleta nocturna (MB-30A · Pieza 1) — negro con rojo muy tenue.
 *
 * ⚠️ Esta paleta es de la PANTALLA DE SESIÓN NOCTURNA (app/sleep-session.tsx):
 * luz mínima y sin azules para no pelear con la melatonina mientras el
 * teléfono pasa la noche encendido en el buró.
 *
 * ⚠️ MB-31 (modo noche de sistema) DEBE ABSORBER estos tokens en su sistema
 * de temas — aquí viven a propósito FUERA de brand.ts para no fundar un
 * segundo sistema de color de marca (el brief lo prohíbe). Los valores van
 * anotados en el reporte de MB-30A.
 */
export const NIGHT = {
  /** Fondo: negro absoluto (OLED apagado). */
  bg: '#000000',
  /** Rojo brasa — texto protagonista (la hora). */
  ember: '#B4443A',
  /** Rojo tenue — texto secundario. */
  emberDim: 'rgba(180,68,58,0.55)',
  /** Rojo apenas visible — labels y metadatos. */
  emberFaint: 'rgba(180,68,58,0.32)',
  /** Líneas y bordes. */
  hairline: 'rgba(180,68,58,0.14)',
  /** Relleno de un control activo (chip/CTA), sigue siendo oscuro. */
  fill: 'rgba(180,68,58,0.10)',
} as const;
