/**
 * CE → estrellas. La "Calidad de la Evaluación" (qué tan completos y recientes están tus
 * datos) se mostraba como "CE 97%", número frío que confunde. Se reemplaza por estrellas
 * 0-5 en pasos de 0.5 (decisión Enrique #8). Lógica PURA (testeable) separada del componente.
 */

/** Texto único de leyenda — fuente de verdad del copy de CE. */
export const CE_STARS_LEGEND =
  'Calidad de la Evaluación — qué tan completos y recientes están tus datos. ' +
  'Más datos y más frescos = más estrellas.';

/** CE 0-100 → estrellas 0-5 en pasos de 0.5. `stars = round(ce/100*5*2)/2`. */
export function ceToStars(ce0to100: number): number {
  if (!Number.isFinite(ce0to100)) return 0;
  const clamped = Math.max(0, Math.min(100, ce0to100));
  return Math.round((clamped / 100) * 5 * 2) / 2;
}

export type StarFill = 'full' | 'half' | 'empty';

/** Convierte un valor 0-5 (pasos 0.5) en los 5 estados de relleno para renderizar. */
export function starFills(stars: number): StarFill[] {
  const out: StarFill[] = [];
  for (let i = 1; i <= 5; i++) {
    if (stars >= i) out.push('full');
    else if (stars >= i - 0.5) out.push('half');
    else out.push('empty');
  }
  return out;
}
