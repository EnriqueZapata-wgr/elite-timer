/**
 * Registro de las cards editoriales del HOY (#hoy-redesign). UNA fuente de verdad para los specs
 * estáticos de cada card: categoría, icono, título, gradient y ruta de tap. Los DATOS (estado
 * completado, progreso, mensaje contextual) se resuelven en runtime desde day-compiler / servicios.
 *
 * `imageBn` queda undefined hasta que lleguen los assets B/N (sprint paralelo) → EditorialCard cae
 * a placeholder de gradient sólido. Cuando estén: `imageBn: require('@/assets/images/agenda/...')`.
 */
import type { ImageSourcePropType } from 'react-native';

export type HoyCardCategory = 'meal' | 'exercise' | 'supplement' | 'rhythm' | 'mind' | 'recovery' | 'metric';

export interface HoyCardSpec {
  cardKey: string;
  category: HoyCardCategory;
  icon: string;          // emoji
  title: string;
  gradient: [string, string];
  /** Ruta de tap por default (algunas cards abren modal en su lugar — lo decide el HOY). */
  route?: string;
  imageBn?: ImageSourcePropType;
}

/** Las 14 cards editoriales, en el orden de render del HOY (el hero va aparte). */
export const HOY_CARD_SPECS: HoyCardSpec[] = [
  { cardKey: 'uv', category: 'metric', icon: '☀️', title: 'UV INDEX', gradient: ['#FFD700', '#FFA500'], route: '/solar' },
  { cardKey: 'checkin', category: 'mind', icon: '❤️', title: 'CHECK-IN EMOCIONAL', gradient: ['#1ABC9C', '#9B59B6'], route: '/checkin' },
  { cardKey: 'proteina', category: 'meal', icon: '🍳', title: 'PROTEÍNA', gradient: ['#FF8C00', '#C0392B'], route: '/food-register' },
  { cardKey: 'agua', category: 'meal', icon: '💧', title: 'AGUA', gradient: ['#3498DB', '#1ABC9C'], route: '/hydration' },
  { cardKey: 'luz_solar', category: 'rhythm', icon: '☀️', title: 'LUZ SOLAR', gradient: ['#FFD700', '#FFA500'] },
  { cardKey: 'meditacion', category: 'mind', icon: '🧘', title: 'MEDITACIÓN', gradient: ['#1ABC9C', '#16A085'], route: '/meditation' },
  { cardKey: 'suplementos', category: 'supplement', icon: '💊', title: 'SUPLEMENTOS', gradient: ['#9B59B6', '#6C3483'], route: '/supplements' },
  { cardKey: 'bano_frio', category: 'recovery', icon: '❄️', title: 'BAÑO FRÍO', gradient: ['#3498DB', '#2C3E50'] },
  { cardKey: 'grounding', category: 'rhythm', icon: '🌿', title: 'GROUNDING', gradient: ['#27AE60', '#8B4513'] },
  { cardKey: 'fuerza', category: 'exercise', icon: '💪', title: 'FUERZA', gradient: ['#E74C3C', '#C0392B'], route: '/log-exercise' },
  { cardKey: 'breathwork', category: 'mind', icon: '🌬', title: 'BREATHWORK', gradient: ['#85C1E9', '#2E86C1'] },
  { cardKey: 'lentes_rojos', category: 'rhythm', icon: '🔴', title: 'LENTES ROJOS', gradient: ['#FF7F50', '#8B0000'] },
  { cardKey: 'cardio', category: 'exercise', icon: '❤️‍🔥', title: 'CARDIO', gradient: ['#E74C3C', '#FFA500'], route: '/log-cardio' },
  { cardKey: 'pasos', category: 'exercise', icon: '🚶', title: 'PASOS', gradient: ['#27AE60', '#8B4513'] },
];

/** Orden COMPLETO de visibilidad (hero + 14), default para el toggle ON/OFF (migración 096). */
export const HOY_CARD_ORDER_DEFAULT: string[] = [
  'hero_agenda',
  'uv', 'checkin', 'proteina', 'agua',
  'luz_solar', 'meditacion', 'suplementos', 'bano_frio', 'grounding', 'fuerza', 'breathwork', 'lentes_rojos',
  'cardio', 'pasos',
];

/** Lookup rápido por cardKey. */
export const HOY_CARD_BY_KEY: Record<string, HoyCardSpec> =
  Object.fromEntries(HOY_CARD_SPECS.map((c) => [c.cardKey, c]));
