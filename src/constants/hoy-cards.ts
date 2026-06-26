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
  // #cableado-final 3.2: 5 cards nuevas. Boolean (toggle desde card, sin route): no_alcohol,
  // no_processed_foods, screen_time_cutoff. journal → /journal. sleep informativa → /reports.
  { cardKey: 'no_alcohol', category: 'recovery', icon: '🚫', title: 'NO ALCOHOL', gradient: ['#34495E', '#1A252F'] },
  { cardKey: 'sleep', category: 'recovery', icon: '🌙', title: 'SUEÑO', gradient: ['#2C3E50', '#1A1A2E'], route: '/reports' },
  { cardKey: 'journal', category: 'mind', icon: '📓', title: 'JOURNAL', gradient: ['#8B6F47', '#5D4E37'], route: '/journal' },
  { cardKey: 'no_processed_foods', category: 'meal', icon: '🥗', title: 'SIN PROCESADOS', gradient: ['#27AE60', '#16A085'] },
  { cardKey: 'screen_time_cutoff', category: 'rhythm', icon: '📵', title: 'OFF-PANTALLAS', gradient: ['#34495E', '#2C3E50'] },
];

/**
 * Orden de visibilidad del HOY, default para el toggle ON/OFF (migración 096).
 * #v13e (reorden): orden cronológico por las 5 sub-secciones (DESPERTAR / NUTRICIÓN / ACTIVIDAD /
 * CIERRE / DESCANSO). #v13f 2.4: SUPLEMENTOS restaurada como card editorial (X/Y tomados) en NUTRICIÓN.
 */
export const HOY_CARD_ORDER_DEFAULT: string[] = [
  // #v13f 2.5: 'hero_agenda' eliminado (card "AHORA" confusa). HOY arranca con DESPERTAR.
  // DESPERTAR
  'uv', 'luz_solar', 'checkin', 'meditacion',
  // NUTRICIÓN
  'proteina', 'agua', 'suplementos', 'no_processed_foods', 'ayuno',
  // ACTIVIDAD
  'fuerza', 'cardio', 'pasos', 'grounding', 'bano_frio',
  // CIERRE
  'breathwork', 'lentes_rojos', 'journal', 'screen_time_cutoff', 'no_alcohol',
  // DESCANSO
  'sleep',
];

/** Lookup rápido por cardKey. */
export const HOY_CARD_BY_KEY: Record<string, HoyCardSpec> =
  Object.fromEntries(HOY_CARD_SPECS.map((c) => [c.cardKey, c]));
