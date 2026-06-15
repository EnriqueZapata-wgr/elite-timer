/**
 * Rutas de captura por parámetro pendiente (Mariana #16).
 *
 * Cada item de "Datos por capturar" (my-health) debe llevar al input EXACTO, no a
 * una pantalla genérica. La clave es la columna de health_measurements; el valor es
 * la ruta de captura con `?focus=<columna>`. La pantalla destino lee `focus` y
 * resalta/abre el campo correspondiente (NumberInputRow `highlight`).
 */
export const DATA_CAPTURE_ROUTES: Record<string, string> = {
  grip_strength_kg: '/edad-atp/composition?focus=grip_strength_kg',
  body_fat_pct: '/edad-atp/composition?focus=body_fat_pct',
  waist_cm: '/edad-atp/composition?focus=waist_cm',
  systolic_bp: '/edad-atp/vitals?focus=systolic_bp',
  vo2max_estimate: '/edad-atp/vitals?focus=vo2max_estimate',
};

/** Ruta para un parámetro pendiente, con fallback al formulario general de salud. */
export function captureRouteFor(key: string): string {
  return DATA_CAPTURE_ROUTES[key] ?? '/health-input';
}
