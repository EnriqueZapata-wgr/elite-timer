/**
 * yo-image-picker — imágenes del tab YO: sex-aware (edad-atp, composición el/ella) + cronotipo.
 * 2026-09-21 (SEXO NUNCA ASUMIDO): sin sexo en el perfil (`sexKey` → null) cada
 * picker cae a una imagen NEUTRA existente. Nunca "el" por defecto.
 * `require()` ESTÁTICO con lookup por clave (image-pick-core resuelve la clave). Solo carga assets
 * → NO se importa en tests. PROACTIVO: el redesign de YO está diferido; estos helpers quedan listos
 * para cuando se cablee (y así Metro ya empaqueta las imágenes).
 */
import type { ImageSourcePropType } from 'react-native';
import { sexKey, cronotipoKey, type CronotipoKey } from '@/src/utils/image-pick-core';

const EDAD_ATP_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/yo/edad-atp-el.webp'),
  female: require('@/assets/images/yo/edad-atp-ella.webp'),
};
/** Neutras (sin persona con sexo) para cuando el perfil no lo dice. */
const EDAD_ATP_NEUTRA: ImageSourcePropType = require('@/assets/images/yo/tendencias.webp');
const COMPOSICION_NEUTRA: ImageSourcePropType = require('@/assets/images/health-hub/mi-salud.webp');
const FITNESS_NEUTRA: ImageSourcePropType = require('@/assets/images/agenda/entrenar/entrenar-01.webp');

const COMPOSICION_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/yo/composicion-el.webp'),
  female: require('@/assets/images/yo/composicion-ella.webp'),
};

const CRONOTIPO_IMAGES: Record<CronotipoKey, ImageSourcePropType> = {
  leon: require('@/assets/images/yo/cronotipo-leon.webp'),
  lobo: require('@/assets/images/yo/cronotipo-lobo.webp'),
  oso: require('@/assets/images/yo/cronotipo-oso.webp'),
  delfin: require('@/assets/images/yo/cronotipo-delfin.webp'),
};

// #cableado-final 3.6: variantes sex-aware nuevas.
const FITNESS_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/habits-portal/fitness-el.webp'),
  female: require('@/assets/images/habits-portal/fitness-ella.webp'),
};
const EMBARAZO_IMAGES: Record<'male' | 'female', ImageSourcePropType> = {
  male: require('@/assets/images/cycle/embarazo/embarazo-el.webp'),
  female: require('@/assets/images/cycle/embarazo/embarazo-ella.webp'),
};

/** Imágenes estáticas restantes del YO (no sex-aware). */
export const YO_STATIC_IMAGES = {
  rank: require('@/assets/images/yo/rank-logros.webp'),
  disciplina: require('@/assets/images/yo/disciplina-semanal.webp'),
  reports: require('@/assets/images/yo/reports.webp'),
  lab: require('@/assets/images/yo/lab-preview.webp'),
  test: require('@/assets/images/yo/test-preview.webp'),
  tendencias: require('@/assets/images/yo/tendencias.webp'),
} as const;

export function pickEdadAtpImage(sex?: string | null): ImageSourcePropType {
  const k = sexKey(sex);
  return k ? EDAD_ATP_IMAGES[k] : EDAD_ATP_NEUTRA;
}

export function pickComposicionImage(sex?: string | null): ImageSourcePropType {
  const k = sexKey(sex);
  return k ? COMPOSICION_IMAGES[k] : COMPOSICION_NEUTRA;
}

export function pickCronotipoImage(chronotype?: string | null): ImageSourcePropType {
  return CRONOTIPO_IMAGES[cronotipoKey(chronotype)];
}

/** Fitness sex-aware; sin sexo, imagen neutra de entrenamiento. */
export function pickFitnessImage(sex?: string | null): ImageSourcePropType {
  const k = sexKey(sex);
  return k ? FITNESS_IMAGES[k] : FITNESS_NEUTRA;
}

/** Embarazo sex-aware. Default FEMALE (la persona embarazada es biológicamente femenina; la
 *  variante male es para el partner masculino). Aún no se usa — listo para la máscara ATP Embarazo. */
export function pickEmbarazoImage(sex?: string | null): ImageSourcePropType {
  return EMBARAZO_IMAGES[sex === 'male' ? 'male' : 'female'];
}
