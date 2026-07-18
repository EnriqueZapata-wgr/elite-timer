/**
 * image-rotation — rotación de la imagen de la card Cardio del HOY (hoy-extra, 2 variantes).
 * `require()` ESTÁTICO (Metro no soporta dinámico). La selección usa seededIndex (determinístico
 * por sesión/día). La lógica pura vive en image-pick-core (testeada); este módulo solo carga assets
 * → NO se importa en tests.
 */
import type { ImageSourcePropType } from 'react-native';
import { seededIndex, tuDiaImageGroup } from '@/src/utils/image-pick-core';

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
  // #post-tu-dia: assets ya generados — cableados.
  nutricion: [require('@/assets/images/habits-portal/nutricion.jpg')],
  ayuno: [require('@/assets/images/habits-portal/ayuno.jpg')],
  sueno: [require('@/assets/images/habits-portal/sueno.jpg')],
  journal: [require('@/assets/images/hoy-extra/journal.png')],
  // fitness: queda fuera de este Record porque es SEX-AWARE → usar pickFitnessImage(sex)
  // de yo-image-picker.ts (devuelve fitness-el.png | fitness-ella.png según biological_sex).
  fitness: [],
  // #cableado-final 3.5: ciclo con 3 variantes → rotación determinística por día/sesión.
  ciclo: [
    require('@/assets/images/cycle/ciclo-01.png'),
    require('@/assets/images/cycle/ciclo-02.png'),
    require('@/assets/images/cycle/ciclo-03.png'),
  ],
};

/** Imagen de una card de hábito (rotación determinística). `undefined` si no hay variantes → gradient. */
export function pickHabitImage(habitKey: string, seedKey?: string): ImageSourcePropType | undefined {
  const variants = HABIT_IMAGES[habitKey];
  if (!variants || variants.length === 0) return undefined;
  return variants[seededIndex(seedKey, variants.length)];
}

/**
 * #v13e 3.B.5 — imagen de la card "TU DÍA" según la HORA del día (no por día). Grupos por franja
 * (tuDiaImageGroup). Asset hoy-extra/tu-dia/* generado y cableado (estructura PLANA, no sub-carpetas).
 * Para el grupo 'despertar' (5–12h) se usan las nuevas `amanecer-*` (más alineadas al concepto
 * "tu día empieza"), no las despertar-* de agenda/ (que siguen sirviendo a la HeroAgendaCard).
 */
const TU_DIA_IMAGES: Record<string, ImageSourcePropType[]> = {
  // 5–12h — usa amanecer-XX (no las despertar-XX de agenda/, que son para HeroAgendaCard)
  // Mega-Sprint C (#132): -03/-04 son upgrades MJ estilo OURA (JPEG q85). Mezclar
  // .png + .jpg en el mismo array es válido (Metro lo soporta).
  despertar: [
    require('@/assets/images/hoy-extra/tu-dia/amanecer-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/amanecer-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/amanecer-03.jpg'),
  ],
  // 12–18h
  'medio-dia': [
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-04.jpg'),
  ],
  // 18–22h
  atardecer: [
    require('@/assets/images/hoy-extra/tu-dia/atardecer-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-04.jpg'),
  ],
  // 22–5h
  noche: [
    require('@/assets/images/hoy-extra/tu-dia/noche-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-04.jpg'),
  ],
};

export function pickTuDiaImage(hour: number, seedKey?: string): ImageSourcePropType | undefined {
  const group = tuDiaImageGroup(hour);
  const variants = TU_DIA_IMAGES[group];
  const pool = variants && variants.length > 0 ? variants : TU_DIA_IMAGES.despertar;
  if (!pool || pool.length === 0) return undefined;
  return pool[seededIndex(seedKey, pool.length)];
}
