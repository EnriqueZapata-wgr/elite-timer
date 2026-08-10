/**
 * Paleta nocturna (MB-30A · Pieza 1) — negro con rojo muy tenue.
 *
 * MB-31A la absorbió en la curva única del sistema de temas, tal como el
 * propio archivo lo pedía: los tokens viven en night-curve.ts (manual 3.7,
 * "una sola curva, tres usos") y aquí solo se re-exportan para que la
 * pantalla del buró (app/sleep-session.tsx) conserve su import.
 */
export { NIGHT } from '@/src/constants/night-curve';
