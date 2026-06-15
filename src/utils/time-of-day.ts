/**
 * Franja del día para el fondo dinámico de HOY (F01.4). Pura y testeable (sin imports
 * nativos ni assets). brand.getHoyBackgroundRequire delega aquí para elegir la imagen.
 */
export type HoyBgBucket = 'sleep' | 'morning' | 'midday' | 'night';

export function hoyBgBucket(hour: number): HoyBgBucket {
  if (hour >= 22 || hour < 5) return 'sleep';   // 22:00–04:59
  if (hour < 12) return 'morning';              // 05:00–11:59
  if (hour < 19) return 'midday';               // 12:00–18:59
  return 'night';                               // 19:00–21:59
}
