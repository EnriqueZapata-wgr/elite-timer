/**
 * tarea-images (MB-20.1) — la foto editorial de cada tarea del checklist.
 *
 * `require()` ESTÁTICO (Metro no soporta dinámico) y en la capa de
 * componentes, NO en tareas-core: los tests node importan el core y el
 * resolver de vitest no transforma assets binarios (mismo criterio que
 * hoy-cards.ts / agenda-image-picker).
 *
 * Se reutilizan los assets que ya existen (electrons/, hoy-extra/,
 * mente/cards, cycle/) — acaban de optimizarse a WebP. Cardio y ciclo rotan
 * con los pickers determinísticos de siempre. Una tarea sin foto cae al
 * placeholder de degradado con glifo (mismo fallback que EditorialCard).
 */
import type { ImageSourcePropType } from 'react-native';
import { pickCardioImage, pickHabitImage } from '@/src/utils/image-rotation';
import type { Momento } from '@/src/services/hoy/tareas-core';

const TAREA_IMAGES: Record<string, ImageSourcePropType> = {
  sunlight: require('@/assets/images/electrons/luz-solar.webp'),
  meditation: require('@/assets/images/electrons/meditacion.webp'),
  supplements: require('@/assets/images/electrons/suplementos.webp'),
  cold_shower: require('@/assets/images/electrons/bano-frio.webp'),
  grounding: require('@/assets/images/electrons/grounding.webp'),
  strength: require('@/assets/images/electrons/fuerza.webp'),
  breathwork: require('@/assets/images/electrons/breathwork.webp'),
  red_glasses: require('@/assets/images/electrons/lentes-rojos.webp'),
  checkin: require('@/assets/images/hoy-extra/checkin.webp'),
  journal: require('@/assets/images/hoy-extra/journal.webp'),
  no_alcohol: require('@/assets/images/hoy-extra/no-alcohol.webp'),
  no_processed_foods: require('@/assets/images/hoy-extra/no-procesados.webp'),
  screen_time_cutoff: require('@/assets/images/hoy-extra/screen-cutoff.webp'),
  water: require('@/assets/images/hoy-extra/agua.webp'),
  protein: require('@/assets/images/hoy-extra/proteina.webp'),
  steps: require('@/assets/images/hoy-extra/pasos.webp'),
  sleep: require('@/assets/images/hoy-extra/sueno.webp'),
  nback: require('@/assets/images/mente/cards/card_nback.webp'),
};

/** La foto de una tarea (rotación determinística donde ya la había). */
export function tareaImage(key: string, seedKey?: string): ImageSourcePropType | undefined {
  if (key === 'cardio') return pickCardioImage(seedKey);
  if (key === 'period_log') return pickHabitImage('ciclo', seedKey);
  if (key.startsWith('agenda-')) return require('@/assets/images/hoy-extra/ayuno.webp');
  return TAREA_IMAGES[key];
}

/**
 * Bandas por momento de la lente AGENDA (MB-20.1 · 2.2): la foto de la
 * franja del día. Mismas imágenes que el fondo por hora del HOY (brand.ts).
 */
export const MOMENTO_BAND_IMAGES: Record<Momento, ImageSourcePropType> = {
  manana: require('@/assets/backgrounds/bg-morning.jpg'),
  tarde: require('@/assets/backgrounds/bg-midday-medium.jpg'),
  noche: require('@/assets/backgrounds/bg-night-low.jpg'),
};
