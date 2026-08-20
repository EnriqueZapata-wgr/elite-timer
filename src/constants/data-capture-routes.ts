/**
 * Rutas de captura por parámetro pendiente (Mariana #16).
 *
 * Cada item de "Datos por capturar" (my-health) debe llevar al input EXACTO, no a
 * una pantalla genérica. La clave es la columna de health_measurements; el valor es
 * la ruta de captura con `?focus=<columna>`. Las pantallas de /edad-atp leen
 * `focus` y resaltan el campo correspondiente (NumberInputRow `highlight`).
 */
import type { Href } from 'expo-router';

export const DATA_CAPTURE_ROUTES: Record<string, Href> = {
  // MB-27 menor 1: la app Medidas registra peso por esta puerta (<10 s).
  weight_kg: '/edad-atp/composition?focus=weight_kg',
  grip_strength_kg: '/edad-atp/composition?focus=grip_strength_kg',
  body_fat_pct: '/edad-atp/composition?focus=body_fat_pct',
  waist_cm: '/edad-atp/composition?focus=waist_cm',
  systolic_bp: '/edad-atp/vitals?focus=systolic_bp',
  vo2max_estimate: '/edad-atp/vitals?focus=vo2max_estimate',
};

/** Ruta para un parámetro pendiente, con fallback a la captura consolidada.
 * Barrido D (20-ago-2026): el fallback apuntaba a /health-input, pantalla ya
 * absorbida por /salud/mis-datos (y que nunca leyó `focus`). Hoy /health-input
 * es un alias; este fallback va directo al destino real. */
export function captureRouteFor(key: string): Href {
  return DATA_CAPTURE_ROUTES[key] ?? '/salud/mis-datos';
}
