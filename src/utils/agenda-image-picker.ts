/**
 * agenda-image-picker — imagen de fondo del Hero Agenda, rotando entre variantes por categoría
 * (42 imgs, 12 categorías). `require()` ESTÁTICO con lookup por carpeta (Metro no soporta dinámico).
 * La lógica pura (seededIndex, categoryToFolder) vive en image-pick-core (testeada). Este módulo
 * solo carga assets → NO se importa en tests.
 */
import type { ImageSourcePropType } from 'react-native';
import { seededIndex, categoryToFolder } from '@/src/utils/image-pick-core';

const AGENDA_IMAGES: Record<string, ImageSourcePropType[]> = {
  despertar: [
    require('@/assets/images/agenda/despertar/despertar-01.webp'),
    require('@/assets/images/agenda/despertar/despertar-02.webp'),
    require('@/assets/images/agenda/despertar/despertar-03.webp'),
    require('@/assets/images/agenda/despertar/despertar-04.webp'),
  ],
  'sol-am': [
    require('@/assets/images/agenda/sol-am/sol-am-01.webp'),
    require('@/assets/images/agenda/sol-am/sol-am-02.webp'),
    require('@/assets/images/agenda/sol-am/sol-am-03.webp'),
  ],
  comida: [
    require('@/assets/images/agenda/comida/comida-01.webp'),
    require('@/assets/images/agenda/comida/comida-02.webp'),
    require('@/assets/images/agenda/comida/comida-03.webp'),
    require('@/assets/images/agenda/comida/comida-04.webp'),
  ],
  entrenar: [
    require('@/assets/images/agenda/entrenar/entrenar-01.webp'),
    require('@/assets/images/agenda/entrenar/entrenar-02.webp'),
    require('@/assets/images/agenda/entrenar/entrenar-03.webp'),
    require('@/assets/images/agenda/entrenar/entrenar-04.webp'),
  ],
  hidratacion: [
    require('@/assets/images/agenda/hidratacion/hidratacion-01.webp'),
    require('@/assets/images/agenda/hidratacion/hidratacion-02.webp'),
    require('@/assets/images/agenda/hidratacion/hidratacion-03.webp'),
    require('@/assets/images/agenda/hidratacion/hidratacion-04.webp'),
  ],
  'sol-pm': [
    require('@/assets/images/agenda/sol-pm/sol-pm-01.webp'),
    require('@/assets/images/agenda/sol-pm/sol-pm-02.webp'),
    require('@/assets/images/agenda/sol-pm/sol-pm-03.webp'),
  ],
  suplementos: [
    require('@/assets/images/agenda/suplementos/suplementos-01.webp'),
    require('@/assets/images/agenda/suplementos/suplementos-02.webp'),
    require('@/assets/images/agenda/suplementos/suplementos-03.webp'),
  ],
  meditacion: [
    require('@/assets/images/agenda/meditacion/meditacion-01.webp'),
    require('@/assets/images/agenda/meditacion/meditacion-02.webp'),
    require('@/assets/images/agenda/meditacion/meditacion-03.webp'),
  ],
  'off-pantallas': [
    require('@/assets/images/agenda/off-pantallas/off-pantallas-01.webp'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-02.webp'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-03.webp'),
  ],
  sleep: [
    require('@/assets/images/agenda/sleep/sleep-01.webp'),
    require('@/assets/images/agenda/sleep/sleep-02.webp'),
    require('@/assets/images/agenda/sleep/sleep-03.webp'),
    require('@/assets/images/agenda/sleep/sleep-04.webp'),
  ],
  cardio: [
    require('@/assets/images/agenda/cardio/cardio-01.webp'),
    require('@/assets/images/agenda/cardio/cardio-02.webp'),
    require('@/assets/images/agenda/cardio/cardio-03.webp'),
    require('@/assets/images/agenda/cardio/cardio-04.webp'),
  ],
  otros: [
    require('@/assets/images/agenda/otros/otros-01.webp'),
    require('@/assets/images/agenda/otros/otros-02.webp'),
    require('@/assets/images/agenda/otros/otros-03.webp'),
  ],
};

/** Imagen del Hero por categoría de carpeta. `seedKey` determinístico → misma img toda la sesión. */
export function pickAgendaImage(category: string, seedKey?: string): ImageSourcePropType | undefined {
  const images = AGENDA_IMAGES[category];
  if (!images || images.length === 0) return undefined;
  return images[seededIndex(seedKey, images.length)];
}

// Re-export para que el caller resuelva carpeta + imagen desde un solo módulo.
export { categoryToFolder } from '@/src/utils/image-pick-core';
