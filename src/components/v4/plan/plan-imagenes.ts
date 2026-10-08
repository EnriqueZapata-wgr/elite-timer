/**
 * Las fotos de PLAN v4 (8-oct-2026 (v4)). B/N medidas y sin persona; cuales
 * son lo decide plan-v4-core (IMAGEN_PILAR, IMAGEN_HERO_PLAN, con la
 * saturacion medida de cada una) y su test amarra que este archivo cargue
 * exactamente esas. Las cinco pilares llevan foto: no se mezcla con glifos.
 */
import type { ImageSourcePropType } from 'react-native';
import type { PilarKey } from '@/src/services/plan/plan-v4-core';

export const FOTO_PILAR: Readonly<Record<PilarKey, ImageSourcePropType>> = {
  suplementos: require('@/assets/images/electrons/suplementos.webp'),
  alimentacion: require('@/assets/images/agenda/comida/comida-04.webp'),
  entrenamiento: require('@/assets/images/health-hub/mi-salud.webp'),
  sueno: require('@/assets/images/hoy-extra/sueno.webp'),
  practicas: require('@/assets/images/intervenciones/calor.webp'),
};

export const FOTO_HERO_PLAN: ImageSourcePropType = require('@/assets/images/hoy-extra/tu-dia/atardecer-03.webp');
