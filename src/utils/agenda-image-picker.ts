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
    require('@/assets/images/agenda/despertar/despertar-01.png'),
    require('@/assets/images/agenda/despertar/despertar-02.png'),
    require('@/assets/images/agenda/despertar/despertar-03.png'),
    require('@/assets/images/agenda/despertar/despertar-04.png'),
  ],
  'sol-am': [
    require('@/assets/images/agenda/sol-am/sol-am-01.png'),
    require('@/assets/images/agenda/sol-am/sol-am-02.png'),
    require('@/assets/images/agenda/sol-am/sol-am-03.png'),
  ],
  comida: [
    require('@/assets/images/agenda/comida/comida-01.png'),
    require('@/assets/images/agenda/comida/comida-02.png'),
    require('@/assets/images/agenda/comida/comida-03.png'),
    require('@/assets/images/agenda/comida/comida-04.png'),
  ],
  entrenar: [
    require('@/assets/images/agenda/entrenar/entrenar-01.png'),
    require('@/assets/images/agenda/entrenar/entrenar-02.png'),
    require('@/assets/images/agenda/entrenar/entrenar-03.png'),
    require('@/assets/images/agenda/entrenar/entrenar-04.png'),
  ],
  hidratacion: [
    require('@/assets/images/agenda/hidratacion/hidratacion-01.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-02.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-03.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-04.png'),
  ],
  'sol-pm': [
    require('@/assets/images/agenda/sol-pm/sol-pm-01.png'),
    require('@/assets/images/agenda/sol-pm/sol-pm-02.png'),
    require('@/assets/images/agenda/sol-pm/sol-pm-03.png'),
  ],
  suplementos: [
    require('@/assets/images/agenda/suplementos/suplementos-01.png'),
    require('@/assets/images/agenda/suplementos/suplementos-02.png'),
    require('@/assets/images/agenda/suplementos/suplementos-03.png'),
  ],
  meditacion: [
    require('@/assets/images/agenda/meditacion/meditacion-01.png'),
    require('@/assets/images/agenda/meditacion/meditacion-02.png'),
    require('@/assets/images/agenda/meditacion/meditacion-03.png'),
  ],
  'off-pantallas': [
    require('@/assets/images/agenda/off-pantallas/off-pantallas-01.png'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-02.png'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-03.png'),
  ],
  sleep: [
    require('@/assets/images/agenda/sleep/sleep-01.png'),
    require('@/assets/images/agenda/sleep/sleep-02.png'),
    require('@/assets/images/agenda/sleep/sleep-03.png'),
    require('@/assets/images/agenda/sleep/sleep-04.png'),
  ],
  cardio: [
    require('@/assets/images/agenda/cardio/cardio-01.png'),
    require('@/assets/images/agenda/cardio/cardio-02.png'),
    require('@/assets/images/agenda/cardio/cardio-03.png'),
    require('@/assets/images/agenda/cardio/cardio-04.png'),
  ],
  otros: [
    require('@/assets/images/agenda/otros/otros-01.png'),
    require('@/assets/images/agenda/otros/otros-02.png'),
    require('@/assets/images/agenda/otros/otros-03.png'),
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
