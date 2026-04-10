/**
 * Electron System — Pesos, rangos y helpers de gamificación ATP.
 *
 * Cada acción del usuario otorga electrones con un peso específico.
 * El total acumulado determina el rango del usuario.
 */

// === PESOS POR FUENTE ===

export const ELECTRON_WEIGHTS = {
  // Booleanos diarios (1/día)
  cold_shower:  { weight: 3.0, name: 'Baño frío',       icon: 'snow-outline',          color: '#38bdf8' },
  meditation:   { weight: 2.5, name: 'Meditación',      icon: 'flower-outline',        color: '#c084fc' },
  strength:     { weight: 3.0, name: 'Fuerza',          icon: 'barbell-outline',       color: '#a8e02a' },
  no_alcohol:   { weight: 1.0, name: 'Sin alcohol',     icon: 'wine-outline',          color: '#f87171' },
  sunlight:     { weight: 1.5, name: 'Luz solar',       icon: 'sunny-outline',         color: '#fbbf24' },
  grounding:    { weight: 1.5, name: 'Grounding',       icon: 'leaf-outline',          color: '#34d399' },
  supplements:  { weight: 1.0, name: 'Suplementos',     icon: 'medical-outline',       color: '#a8e02a' },
  breathwork:   { weight: 1.0, name: 'Breathwork',      icon: 'cloud-outline',         color: '#60a5fa' },

  // Cuantitativos diarios (proporcional al %)
  protein:      { weight: 2.0, name: 'Proteína',        icon: 'restaurant-outline',    color: '#a6c8ff' },
  steps:        { weight: 3.0, name: 'Pasos',           icon: 'footsteps-outline',     color: '#ffc54c' },
  water:        { weight: 1.5, name: 'Agua',            icon: 'water-outline',         color: '#60a5fa' },
  sleep:        { weight: 3.0, name: 'Sueño',           icon: 'moon-outline',          color: '#818cf8' },

  // Por evento
  checkin:      { weight: 2.0, name: 'Check-in emocional', icon: 'heart-circle-outline', color: '#f472b6' },
  lab_upload:   { weight: 10.0, name: 'Lab upload',     icon: 'document-outline',      color: '#c084fc' },

  // Ayuno (por sesión completada)
  fasting_12h:  { weight: 1.0, name: 'Ayuno 12h',       icon: 'timer-outline',         color: '#fbbf24' },
  fasting_16h:  { weight: 2.0, name: 'Ayuno 16h',       icon: 'timer-outline',         color: '#fb923c' },
  fasting_24h:  { weight: 3.0, name: 'Ayuno 24h',       icon: 'flame-outline',         color: '#ef4444' },
} as const;

export type ElectronSource = keyof typeof ELECTRON_WEIGHTS;

// === RANGOS ===

export const ELECTRON_RANKS = [
  { name: 'Partícula', min: 0,    max: 50,       icon: 'flash-outline',      color: '#999999' },
  { name: 'Átomo',     min: 51,   max: 200,      icon: 'nuclear-outline',    color: '#38bdf8' },
  { name: 'Molécula',  min: 201,  max: 500,      icon: 'git-merge-outline',  color: '#a8e02a' },
  { name: 'Reactor',   min: 501,  max: 1000,     icon: 'flame-outline',      color: '#fbbf24' },
  { name: 'Fusión',    min: 1001, max: 2500,     icon: 'sunny-outline',      color: '#fb923c' },
  { name: 'Supernova', min: 2501, max: Infinity,  icon: 'star-outline',      color: '#c084fc' },
] as const;

/** Rango actual por total de electrones acumulados. */
export function getRank(total: number) {
  return ELECTRON_RANKS.find(r => total >= r.min && total <= r.max) ?? ELECTRON_RANKS[0];
}

/** Siguiente rango (null si ya es Supernova). */
export function getNextRank(total: number) {
  const idx = ELECTRON_RANKS.findIndex(r => total >= r.min && total <= r.max);
  return idx < ELECTRON_RANKS.length - 1 ? ELECTRON_RANKS[idx + 1] : null;
}

/** Electrones de un cuantitativo proporcional al % de cumplimiento. */
export function calcQuantElectrons(source: ElectronSource, current: number, target: number): number {
  const cfg = ELECTRON_WEIGHTS[source];
  const pct = Math.min(1, current / target);
  return Math.round(cfg.weight * pct * 100) / 100;
}

/** Tier de ayuno por horas completadas. */
export function getFastingTier(hours: number): ElectronSource | null {
  if (hours >= 24) return 'fasting_24h';
  if (hours >= 16) return 'fasting_16h';
  if (hours >= 12) return 'fasting_12h';
  return null;
}
