/**
 * image-rotation — rotación de la imagen de la card Cardio del HOY (hoy-extra, 2 variantes).
 * `require()` ESTÁTICO (Metro no soporta dinámico). La selección usa seededIndex (determinístico
 * por sesión/día). La lógica pura vive en image-pick-core (testeada); este módulo solo carga assets
 * → NO se importa en tests.
 */
import type { ImageSourcePropType } from 'react-native';
import { seededIndex } from '@/src/utils/image-pick-core';

const CARDIO_IMAGES: ImageSourcePropType[] = [
  require('@/assets/images/hoy-extra/cardio-01.png'),
  require('@/assets/images/hoy-extra/cardio-02.png'),
];

/** Imagen de Cardio para la sesión: misma `seedKey` (ej. `${userId}-${today}`) → misma imagen. */
export function pickCardioImage(seedKey?: string): ImageSourcePropType {
  return CARDIO_IMAGES[seededIndex(seedKey, CARDIO_IMAGES.length)];
}

/**
 * 2.7 — Imágenes de las cards de hábitos (mismo patrón de rotación determinística que cardio).
 * Cada hábito mapea a un ARRAY de variantes. Hoy la mayoría tiene 0-1 (placeholder gradient si 0).
 * Cuando Enrique genere más variantes, solo se agregan al array y la rotación arranca sola.
 * `require()` ESTÁTICO — los pendientes quedan como array vacío (NO escribir require de archivo
 * inexistente: rompería Metro).
 */
const HABIT_IMAGES: Record<string, ImageSourcePropType[]> = {
  // Con asset existente:
  meditacion: [require('@/assets/images/electrons/meditacion.png')],
  respiracion: [require('@/assets/images/electrons/breathwork.png')],
  checkin: [require('@/assets/images/hoy-extra/checkin.png')],
  hidratacion: [require('@/assets/images/hoy-extra/agua.png')],
  atp_sol: [require('@/assets/images/electrons/luz-solar.png')],
  suplementacion: [require('@/assets/images/electrons/suplementos.png')],
  // Pendientes de generar (placeholder gradient hasta tener el asset):
  nutricion: [],   // TODO: assets/images/habits-portal/nutricion.png
  fitness: [],     // TODO: assets/images/habits-portal/fitness.png
  ayuno: [],       // TODO: assets/images/hoy-extra/ayuno.png
  sueno: [],       // TODO: assets/images/hoy-extra/sueno.png
  journal: [],     // TODO: assets/images/electrons/journal.png
  ciclo: [],       // TODO: assets/images/cycle/ciclo.png
};

/** Imagen de una card de hábito (rotación determinística). `undefined` si no hay variantes → gradient. */
export function pickHabitImage(habitKey: string, seedKey?: string): ImageSourcePropType | undefined {
  const variants = HABIT_IMAGES[habitKey];
  if (!variants || variants.length === 0) return undefined;
  return variants[seededIndex(seedKey, variants.length)];
}
