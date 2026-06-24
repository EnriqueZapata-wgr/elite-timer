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
