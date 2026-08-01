/**
 * app-icon-map — EL archivo que se cambia el día que lleguen los SVG.
 *
 * Una línea por app: nombre lógico → dibujo. Hoy los dibujos son Ionicons de
 * relleno, a propósito: Enrique resuelve el set en paralelo y este run entrega
 * el enchufe, no el icono definitivo. Cuando lleguen, se sustituye este mapa y
 * los iconos cambian TODOS a la vez, sin tocar ninguna pantalla.
 *
 * Es un módulo de datos puros (el import de Ionicons es `import type`, se borra
 * en compilación) para que los tests puedan verificar la cobertura sin montar
 * React Native.
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const ICON_MAP: Record<string, IoniconName> = {
  // ── Mente ──
  mente: 'sparkles-outline',
  meditar: 'flower-outline',
  respirar: 'cloud-outline',
  emociones: 'heart-outline',
  journal: 'book-outline',
  sueno: 'moon-outline',
  nback: 'grid-outline',

  // ── Cuerpo ──
  entrenar: 'barbell-outline',
  cardio: 'pulse-outline',
  movilidad: 'body-outline',
  rm: 'trophy-outline',
  records: 'ribbon-outline',

  // ── Hábitos diarios ──
  comida: 'restaurant-outline',
  hidratacion: 'water-outline',
  ayuno: 'hourglass-outline',
  suplementos: 'medkit-outline',
  recetas: 'reader-outline',
  'lista-compra': 'cart-outline',

  // ── Salud ──
  sol: 'sunny-outline',
  glucosa: 'analytics-outline',
  cetonas: 'flame-outline',
  ciclo: 'ellipse-outline',
  labs: 'flask-outline',
  protocolos: 'clipboard-outline',

  // ── Sistema ──
  ajustes: 'settings-outline',

  // ── Puertas de SALUD ──
  // No son apps de la sala, pero comparten el mismo enchufe: el día del cambio
  // de set no se quedan fuera.
  'salud-hoy': 'today-outline',
  'salud-datos': 'stats-chart-outline',
  'salud-evolucion': 'trending-up-outline',
  'salud-expediente': 'folder-open-outline',
  'salud-ciclo': 'ellipse-outline',
};

/** El dibujo cuando un nombre no está en el mapa. Visible, para que se note. */
export const ICON_FALLBACK: IoniconName = 'help-circle-outline';

export function iconFor(name: string): IoniconName {
  return ICON_MAP[name] ?? ICON_FALLBACK;
}

export function hasAppIcon(name: string): boolean {
  return name in ICON_MAP;
}

export const APP_ICON_NAMES = Object.keys(ICON_MAP);
