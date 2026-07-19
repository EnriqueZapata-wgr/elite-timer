/**
 * Check-in axes — núcleo PURO (sin react-native/supabase/brand), testeable.
 *
 * MB-5: `emotional_checkins.pleasantness` y `energy_level` existían en el tipo
 * y day-compiler los lee (señal cross-pillar de mood), pero la UI nunca los
 * escribía → siempre null. Se derivan del modelo RULER de forma determinística:
 *
 * - El cuadrante fija el signo de cada eje (pleasant/unpleasant · high/low).
 * - Las emociones elegidas fijan la magnitud (energy 1-10, intensity 1-10).
 *
 * Escala resultante 1-10, compatible con day-compiler (`isLow: pleasantness <= 4`).
 * No importa emotions-library (arrastra brand.ts → require() de imágenes):
 * recibe los valores numéricos ya extraídos.
 */

export type CheckinQuadrant = 'high_pleasant' | 'high_unpleasant' | 'low_pleasant' | 'low_unpleasant';

export interface EmotionAxes {
  /** Nivel de energía 1-10 de la emoción (emotions-library). */
  energy: number;
  /** Intensidad 1-10 dentro del cuadrante (emotions-library). */
  intensity: number;
}

export interface DerivedAxes {
  /** 1-10; <= 4 se considera mood bajo (day-compiler). */
  pleasantness: number;
  /** 1-10. */
  energy_level: number;
}

const clamp10 = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

/**
 * Deriva pleasantness/energy_level del cuadrante + emociones seleccionadas.
 *
 * pleasantness: base neutra 5; los cuadrantes agradables suman la mitad de la
 * intensidad promedio, los desagradables la restan. Sin emociones (no debería
 * pasar — la UI exige >= 1) cae al centro del semieje: 7 agradable, 3 desagradable.
 *
 * energy_level: promedio del `energy` de las emociones; fallback 7 (alta) / 3 (baja).
 */
export function deriveCheckinAxes(quadrant: CheckinQuadrant, emotions: EmotionAxes[]): DerivedAxes {
  const pleasant = quadrant === 'high_pleasant' || quadrant === 'low_pleasant';
  const highEnergy = quadrant === 'high_pleasant' || quadrant === 'high_unpleasant';

  const valid = emotions.filter(
    (e) => Number.isFinite(e.energy) && Number.isFinite(e.intensity),
  );

  let pleasantness: number;
  let energy: number;

  if (valid.length === 0) {
    pleasantness = pleasant ? 7 : 3;
    energy = highEnergy ? 7 : 3;
  } else {
    const avgIntensity = valid.reduce((s, e) => s + e.intensity, 0) / valid.length;
    const avgEnergy = valid.reduce((s, e) => s + e.energy, 0) / valid.length;
    pleasantness = pleasant ? 5 + avgIntensity / 2 : 5 - avgIntensity / 2;
    energy = avgEnergy;
  }

  return { pleasantness: clamp10(pleasantness), energy_level: clamp10(energy) };
}
