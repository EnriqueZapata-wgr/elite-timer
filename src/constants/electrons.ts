/**
 * Electron System — Pesos, rangos y helpers de gamificación ATP.
 *
 * Cada acción del usuario otorga electrones con un peso específico.
 * El total acumulado determina el rango del usuario.
 */

// Sprint 2 E: color por concepto desde la fuente única (audit §3 — un concepto = un color).
import { CONCEPT_COLORS } from '@/src/constants/concept-colors';

// === PESOS POR FUENTE ===

export const ELECTRON_WEIGHTS = {
  // Booleanos diarios (1/día)
  cold_shower:  { weight: 3.0, name: 'Baño frío',       icon: 'snow-outline',          color: '#38bdf8' },
  meditation:   { weight: 2.5, name: 'Meditación',      icon: 'flower-outline',        color: '#c084fc' },
  strength:     { weight: 3.0, name: 'Fuerza',          icon: 'barbell-outline',       color: CONCEPT_COLORS.fitness.color },
  no_alcohol:   { weight: 1.0, name: 'Sin alcohol',     icon: 'wine-outline',          color: '#f87171' },
  sunlight:     { weight: 1.5, name: 'Luz solar',       icon: 'sunny-outline',         color: CONCEPT_COLORS.sol.color },
  grounding:    { weight: 1.5, name: 'Grounding',       icon: 'leaf-outline',          color: '#34d399' },
  supplements:  { weight: 1.0, name: 'Suplementos',     icon: 'medical-outline',       color: CONCEPT_COLORS.suplementos.color },
  breathwork:   { weight: 1.0, name: 'Breathwork',      icon: 'cloud-outline',         color: '#60a5fa' },
  red_glasses:  { weight: 1.0, name: 'Lentes rojos',    icon: 'glasses-outline',       color: '#f87171' },
  period_log:   { weight: 1.0, name: 'Registrar ciclo', icon: 'calendar-outline',      color: '#fb7185' },
  // #cableado-final 3.1: nuevos electrones booleanos (icon = nombre Ionicons; el emoji decorativo
  // vive en el spec de hoy-cards). El `type`/`description` del buzón no aplican: el shape real es
  // {weight,name,icon,color}.
  no_processed_foods:  { weight: 2.0, name: 'Sin procesados',           icon: 'nutrition-outline',       color: '#34d399' },
  screen_time_cutoff:  { weight: 1.0, name: 'Off-pantallas pre-sueño',  icon: 'phone-portrait-outline',  color: '#94a3b8' },
  // #v13e 3.A.3: cardio booleano VERIFICADO (completed = ≥1 sesión en cardio_sessions hoy). El award
  // sucede al guardar en /log-cardio + reconcileVerifiedLedger lo mantiene honesto.
  cardio:              { weight: 2.5, name: 'Cardio',                   icon: 'heart-half-outline',      color: '#fb7185' },
  // dx-f3: compleción diaria de una intervención de Mi Protocolo. NO es toggle del HOY (no va en
  // MANDATORY_BOOLEANS): el award sale de logCompletion con idempotencyKey por intervención+día.
  intervention:        { weight: 1.5, name: 'Intervención',             icon: 'medkit-outline',          color: '#1D9E75' },

  // Cuantitativos diarios (proporcional al %)
  protein:      { weight: 2.0, name: 'Proteína',        icon: 'restaurant-outline',    color: CONCEPT_COLORS.nutricion.color },
  steps:        { weight: 3.0, name: 'Pasos',           icon: 'footsteps-outline',     color: '#ffc54c' },
  water:        { weight: 1.5, name: 'Agua',            icon: 'water-outline',         color: CONCEPT_COLORS.agua.color },
  sleep:        { weight: 3.0, name: 'Sueño',           icon: 'moon-outline',          color: '#818cf8' },

  // Por evento
  checkin:      { weight: 2.0, name: 'Check-in emocional', icon: 'heart-circle-outline', color: '#f472b6' },
  journal:      { weight: 1.5, name: 'Journal',            icon: 'book-outline',          color: '#c084fc' },
  glucose_log:  { weight: 1.0, name: 'Registro glucosa',   icon: 'analytics-outline',     color: '#fb923c' },
  lab_upload:   { weight: 10.0, name: 'Lab upload',        icon: 'document-outline',      color: '#c084fc' },

  // Ayuno (por sesión completada)
  fasting_12h:  { weight: 1.0, name: 'Ayuno 12h',       icon: 'timer-outline',         color: '#fbbf24' },
  fasting_16h:  { weight: 2.0, name: 'Ayuno 16h',       icon: 'timer-outline',         color: '#fb923c' },
  fasting_24h:  { weight: 3.0, name: 'Ayuno 24h',       icon: 'flame-outline',         color: '#ef4444' },

  // Evaluaciones funcionales (por evento)
  functional_quiz: { weight: 5.0, name: 'Evaluación funcional', icon: 'clipboard-outline', color: '#c084fc' },

  // ATP SOL — exposición solar consciente
  sun_awareness:   { weight: 1.0, name: 'Consciencia solar',  icon: 'eye-outline',    color: '#fbbf24' },
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
