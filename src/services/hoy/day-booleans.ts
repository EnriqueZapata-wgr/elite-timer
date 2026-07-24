/**
 * Booleanos del HOY — listas puras extraídas de day-compiler (MB-5) para que
 * el patrón "3 lugares" de un electrón booleano sea testeable sin arrastrar
 * supabase/servicios:
 *
 *   1. Definición  → ELECTRON_WEIGHTS (src/constants/electrons.ts)
 *   2. Otorgamiento → awardBooleanElectron(...) + emit('electrons_changed')
 *   3. Display/conteo → estas listas (activeBoolKeys = persistidos ∪ MANDATORY;
 *      verificados además en VERIFIED_ELECTRON_KEYS con su query de conteo)
 *
 * Si el lugar 3 falta, el electrón "se otorga" pero su card jamás palomea
 * (falla en silencio). Ver regresión en __tests__/day-booleans.test.ts.
 */
import type { Href } from 'expo-router';

export const DEFAULT_BOOLEANS = ['sunlight', 'meditation', 'supplements', 'cold_shower', 'grounding', 'no_alcohol',
  // #cableado-final 3.1: nuevos hábitos booleanos para que sus cards reflejen estado (completed/weight).
  'journal', 'no_processed_foods', 'screen_time_cutoff',
  // #v13d 2.2: checkin verificado entra a booleanElectrons → su card refleja `Hecho hoy ✓`.
  // `completed` se deriva de actividad real (emotional_checkins de hoy), no del blob — ver verifiedCompleted.
  'checkin'];

/**
 * #v13e 3.A.1 — CAUSA RAÍZ del "toggle silencioso" (SIN PROCESADOS / OFF-PANTALLAS no palomeaban).
 *
 * `activeBoolKeys = prefs.active_boolean_electrons ?? DEFAULT_BOOLEANS` usa la lista PERSISTIDA del
 * usuario cuando existe. Pero el DEFAULT de la columna (migración 043_day_preferences.sql) es solo
 * los 6 originales ['sunlight','meditation','supplements','cold_shower','grounding','no_alcohol'], y
 * protocol-config (ALL_ELECTRONS) NO ofrece journal/no_processed_foods/screen_time_cutoff como
 * toggleables. Así que esos keys NUNCA entran a la lista persistida → nunca entran a booleanElectrons
 * → al tocar la card, el toggle escribe un electron_log huérfano + un blob sin el key, y al recompilar
 * la card no tiene estado (`completed` undefined) → se queda en "pending" para siempre. (no_alcohol y
 * checkin SÍ palomean porque ambos sí son seleccionables / viven en la lista persistida.)
 *
 * FIX sin migración: estos hábitos son "core" (no deseleccionables) → viven en código, no en prefs.
 * Se fuerzan SIEMPRE en activeBoolKeys vía unión, respetando la (de)selección de los seleccionables.
 * `cardio` (#v13e 3.A.3) es verificado y tampoco es seleccionable → también va aquí.
 */
export const MANDATORY_BOOLEANS = ['journal', 'no_processed_foods', 'screen_time_cutoff', 'cardio',
  // N-Back (spec 2026-07-23 §5): card de HOY para todos, verificada — el spec
  // manda integrarlo al HOY con el mismo patrón que meditación, y los
  // verificados no-seleccionables viven aquí (no en prefs).
  'nback'];

/**
 * Electrones cuya `completed` se deriva de actividad real (no del blob).
 * Tap en HOY sobre uno NO los prende — lleva a la pantalla de actividad.
 * El compilador los enciende solos cuando hay un registro real ese día.
 *
 * `period_log` solo se ofrece a usuarias con `biological_sex === 'female'`.
 */
export const VERIFIED_ELECTRON_KEYS = ['meditation', 'breathwork', 'strength', 'supplements', 'period_log', 'checkin',
  // #v13e 3.A.3: cardio verificado — completed = ≥1 sesión en cardio_sessions hoy.
  'cardio',
  // #17: journal verificado — completed = ≥1 entrada en journal_entries hoy (espejo de checkin).
  'journal',
  // N-Back: completed = ≥1 round completado hoy (nback_sessions.date).
  'nback'] as const;
export type VerifiedElectronKey = typeof VERIFIED_ELECTRON_KEYS[number];

/** Ruta de tap para cada electrón verificado.
 * Routing GRANULAR (#1/#90): tap → pantalla específica de la actividad
 * (meditación → /meditation, checkin → /checkin); ejercicio sigue a /fitness-hub. */
export const VERIFIED_ELECTRON_ROUTES: Record<VerifiedElectronKey, Href> = {
  meditation: '/meditation',
  breathwork: '/breathing',
  strength: '/fitness-hub',
  supplements: '/supplements',
  period_log: '/cycle',
  checkin: '/checkin',
  cardio: '/log-cardio', // FIT-3 (MB-3): directo a registrar sesión
  journal: '/journal',
  nback: '/mente/nback', // home del módulo (desde ahí Start session)
};

/** Electrones que solo se ofrecen a un subconjunto de usuarios. */
export const FEMALE_ONLY_ELECTRONS = new Set<string>(['period_log']);

// ─── Opciones seleccionables del EditDayModal (MB-5: movidas aquí — puras) ───

export interface ElectronOption {
  key: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
}

// Todos los electrones disponibles (el usuario elige cuáles trackear)
export const ALL_BOOLEAN_OPTIONS: ElectronOption[] = [
  { key: 'sunlight',     name: 'Luz solar',     icon: 'sunny-outline',   color: '#fbbf24', weight: 1.5 },
  { key: 'meditation',   name: 'Meditación',    icon: 'flower-outline',  color: '#c084fc', weight: 2.5 },
  { key: 'supplements',  name: 'Suplementos',   icon: 'medical-outline', color: '#a8e02a', weight: 1.0 },
  { key: 'cold_shower',  name: 'Baño frío',     icon: 'snow-outline',    color: '#38bdf8', weight: 3.0 },
  { key: 'grounding',    name: 'Grounding',     icon: 'leaf-outline',    color: '#34d399', weight: 1.5 },
  { key: 'no_alcohol',   name: 'Sin alcohol',   icon: 'wine-outline',    color: '#f87171', weight: 1.0 },
  { key: 'strength',     name: 'Fuerza',        icon: 'barbell-outline', color: '#a8e02a', weight: 3.0 },
  { key: 'breathwork',   name: 'Breathwork',    icon: 'cloud-outline',   color: '#60a5fa', weight: 1.0 },
  { key: 'red_glasses',  name: 'Lentes rojos',  icon: 'glasses-outline', color: '#f87171', weight: 1.0 },
  { key: 'period_log',   name: 'Registrar ciclo', icon: 'calendar-outline', color: '#fb7185', weight: 1.0 },
];

export const ALL_QUANT_OPTIONS: ElectronOption[] = [
  { key: 'protein', name: 'Proteína', icon: 'restaurant-outline', color: '#a6c8ff', weight: 2.0 },
  { key: 'steps',   name: 'Pasos',    icon: 'footsteps-outline',  color: '#ffc54c', weight: 3.0 },
  { key: 'water',   name: 'Agua',     icon: 'water-outline',      color: '#60a5fa', weight: 1.5 },
  { key: 'sleep',   name: 'Sueño',    icon: 'moon-outline',       color: '#818cf8', weight: 3.0 },
];
