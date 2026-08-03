/**
 * intervention-image-picker — assets de concepto visual por intervención
 * (Mega-Sprint C · el fix real de #132). `require()` ESTÁTICO (Metro no soporta
 * dinámico) + lookup por la clave que devuelve `interventionImageKey` (puro).
 *
 * Las 11 imágenes son conceptos visuales (JPEG MJ estilo OURA) que las
 * `categories` del DX no distinguían: grounding, frío, calor, respiración, oral,
 * lentes, luz roja, audio, naturaleza, mente, cognitivo.
 */
import type { ImageSourcePropType } from 'react-native';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import { interventionImageKey, type InterventionImageKey } from '@/src/utils/image-pick-core';

const IMAGES: Record<InterventionImageKey, ImageSourcePropType> = {
  grounding: require('@/assets/images/intervenciones/grounding.webp'),
  frio: require('@/assets/images/intervenciones/frio.webp'),
  calor: require('@/assets/images/intervenciones/calor.webp'),
  respiracion: require('@/assets/images/intervenciones/respiracion.webp'),
  oral: require('@/assets/images/intervenciones/oral.webp'),
  lentes: require('@/assets/images/intervenciones/lentes.webp'),
  'luz-roja': require('@/assets/images/intervenciones/luz-roja.webp'),
  audio: require('@/assets/images/intervenciones/audio.webp'),
  naturaleza: require('@/assets/images/intervenciones/naturaleza.webp'),
  mente: require('@/assets/images/intervenciones/mente.webp'),
  cognitivo: require('@/assets/images/intervenciones/cognitivo.webp'),
};

/**
 * Imagen de concepto visual para una intervención (por `intervention_key`), o
 * `undefined` si no matchea → el caller cae al sistema de carpetas por categoría.
 * Resuelve la `family` desde el catálogo (más específica que la key).
 */
export function pickInterventionImage(interventionKey: string | null | undefined): ImageSourcePropType | undefined {
  if (!interventionKey) return undefined;
  const def = INTERVENTION_BY_KEY[interventionKey];
  const imgKey = interventionImageKey({ family: def?.family ?? null, key: interventionKey });
  return imgKey ? IMAGES[imgKey] : undefined;
}
