/**
 * yo-image-picker — imágenes del tab YO: sex-aware (edad-atp, composición el/ella) + cronotipo.
 * `require()` ESTÁTICO con lookup por clave (image-pick-core resuelve la clave). Solo carga assets
 * → NO se importa en tests. PROACTIVO: el redesign de YO está diferido; estos helpers quedan listos
 * para cuando se cablee (y así Metro ya empaqueta las imágenes).
 */
import type { ImageSourcePropType } from 'react-native';
import { sexKey, cronotipoKey, type CronotipoKey } from '@/src/utils/image-pick-core';

const EDAD_ATP_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/yo/edad-atp-el.png'),
  female: require('@/assets/images/yo/edad-atp-ella.png'),
};

const COMPOSICION_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/yo/composicion-el.png'),
  female: require('@/assets/images/yo/composicion-ella.png'),
};

const CRONOTIPO_IMAGES: Record<CronotipoKey, ImageSourcePropType> = {
  leon: require('@/assets/images/yo/cronotipo-leon.png'),
  lobo: require('@/assets/images/yo/cronotipo-lobo.png'),
  oso: require('@/assets/images/yo/cronotipo-oso.png'),
  delfin: require('@/assets/images/yo/cronotipo-delfin.png'),
};

// #cableado-final 3.6: variantes sex-aware nuevas.
const FITNESS_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/habits-portal/fitness-el.png'),
  female: require('@/assets/images/habits-portal/fitness-ella.png'),
};
const EMBARAZO_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/cycle/embarazo/embarazo-el.png'),
  female: require('@/assets/images/cycle/embarazo/embarazo-ella.png'),
};

/** Imágenes estáticas restantes del YO (no sex-aware). */
export const YO_STATIC_IMAGES = {
  rank: require('@/assets/images/yo/rank-logros.png'),
  disciplina: require('@/assets/images/yo/disciplina-semanal.png'),
  reports: require('@/assets/images/yo/reports.png'),
  lab: require('@/assets/images/yo/lab-preview.png'),
  test: require('@/assets/images/yo/test-preview.png'),
  tendencias: require('@/assets/images/yo/tendencias.png'),
} as const;

export function pickEdadAtpImage(sex?: string | null): ImageSourcePropType {
  return EDAD_ATP_IMAGES[sexKey(sex)];
}

export function pickComposicionImage(sex?: string | null): ImageSourcePropType {
  return COMPOSICION_IMAGES[sexKey(sex)];
}

export function pickCronotipoImage(chronotype?: string | null): ImageSourcePropType {
  return CRONOTIPO_IMAGES[cronotipoKey(chronotype)];
}

/** Fitness sex-aware (default male). */
export function pickFitnessImage(sex?: string | null): ImageSourcePropType {
  return FITNESS_IMAGES[sexKey(sex)];
}

/** Embarazo sex-aware. Default FEMALE (la persona embarazada es biológicamente femenina; la
 *  variante male es para el partner masculino). Aún no se usa — listo para la máscara ATP Embarazo. */
export function pickEmbarazoImage(sex?: string | null): ImageSourcePropType {
  return EMBARAZO_IMAGES[sex === 'male' ? 'male' : 'female'];
}
