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
 *
 * MB-26 P1: sobre el lugar 3 se aplica ADEMÁS el filtro de estados
 * (habit-states-core): graduado y reposo salen del renglón sin borrar nada.
 * El hueco simétrico al de checkin es encender un hábito filtrado sin
 * devolverlo a activo — por eso toda puerta que enciende (installApp,
 * hoy-habitos, aplicar pack) llama reactivarHabitos. Contrato con test.
 */
import type { Href } from 'expo-router';
// MB-19.2: `icon` es nombre lógico del AppIcon, no un Ionicon. Se pinta con <AppIcon>.
import type { AppIconName } from '@/src/components/ui/app-icon-names';

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
 * la card no tiene estado (`completed` undefined) → se queda en "pending" para siempre. (no_alcohol
 * sí palomea porque es seleccionable y vive en el default de la columna.)
 *
 * FIX sin migración: estos hábitos son "core" (no deseleccionables) → viven en código, no en prefs.
 * Se fuerzan SIEMPRE en activeBoolKeys vía unión, respetando la (de)selección de los seleccionables.
 * `cardio` (#v13e 3.A.3) es verificado y tampoco es seleccionable → también va aquí.
 *
 * `checkin` (bug Mariana M1, 2026-08-03): cayó EXACTAMENTE en este hueco. Este comentario
 * afirmaba que "checkin sí palomea porque es seleccionable" y era falso: nunca estuvo en
 * ALL_BOOLEAN_OPTIONS ni en el default de la columna, así que cualquier usuaria con fila
 * persistida (la crean editar meta de agua/ayuno, quitar un evento, el backfill 063) perdía la
 * card para siempre, sin forma de reactivarla. Es el hábito raíz de Mente y verificado como
 * journal/cardio → entra a MANDATORY. La migración 248 repara las filas ya rotas y el default.
 */
export const MANDATORY_BOOLEANS = ['journal', 'no_processed_foods', 'screen_time_cutoff', 'cardio', 'checkin'];
// N-Back (decisión Enrique 2026-07-23): NO es hábito universal — es opt-in.
// Salió de MANDATORY (ya no suma 2.5 al denominador de todos) y entró a
// ALL_BOOLEAN_OPTIONS: quien lo activa en sus hábitos conserva card verificada
// (VERIFIED_ELECTRON_KEYS) y e- como siempre.

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

/** Rutas granulares de tap SOLO donde divergen del puente electrón→app.
 *
 * MB-20.3 P4: siete de las nueve entradas eran duplicado exacto de lo que ya
 * resuelve el puente (electron-app-bridge → app-registry): el día que el
 * registro moviera una app, TAREAS habría seguido mandando a la ruta vieja y
 * nada habría avisado. Quedan solo las dos que dicen algo que el puente no
 * sabe; todo lo demás resuelve por routeForBool (tareas-core). El test
 * rutas-pantallas-reales cruza cada ruta contra los archivos de app/. */
export const VERIFIED_ELECTRON_ROUTES: Partial<Record<VerifiedElectronKey, Href>> = {
  // El puente diría /emotions (el hub del módulo); la card manda al FLUJO
  // de check-in. Device test Enrique MB-20.2: checkin → /checkin.
  checkin: '/checkin',
  // El puente diría /fitness-cardio (el hub); la card manda DIRECTO a
  // registrar sesión. FIT-3 (MB-3): cardio → /log-cardio.
  cardio: '/log-cardio',
};

/** Electrones que solo se ofrecen a un subconjunto de usuarios. */
export const FEMALE_ONLY_ELECTRONS = new Set<string>(['period_log']);

// ─── Universo de electrones seleccionables (MB-5: puras) ───
// MB-12 E-3: la puerta volvió — /hoy-habitos escribe las listas vía
// electron-prefs-service (writer espejo de visibility-service) y emite
// 'electrons_changed'. El opt-in de nback vive ahí.

export interface ElectronOption {
  key: string;
  name: string;
  icon: AppIconName;
  color: string;
  weight: number;
}

// Todos los electrones disponibles (el usuario elige cuáles trackear)
export const ALL_BOOLEAN_OPTIONS: ElectronOption[] = [
  { key: 'sunlight',     name: 'Luz solar',     icon: 'sol',          color: '#fbbf24', weight: 1.5 },
  { key: 'meditation',   name: 'Meditación',    icon: 'meditar',      color: '#c084fc', weight: 2.5 },
  { key: 'supplements',  name: 'Suplementos',   icon: 'suplementos',  color: '#a8e02a', weight: 1.0 },
  { key: 'cold_shower',  name: 'Baño frío',     icon: 'bano-frio',    color: '#38bdf8', weight: 3.0 },
  { key: 'grounding',    name: 'Grounding',     icon: 'grounding',    color: '#34d399', weight: 1.5 },
  { key: 'no_alcohol',   name: 'Sin alcohol',   icon: 'sin-alcohol',  color: '#f87171', weight: 1.0 },
  { key: 'strength',     name: 'Fuerza',        icon: 'entrenar',     color: '#a8e02a', weight: 3.0 },
  { key: 'breathwork',   name: 'Breathwork',    icon: 'respirar',     color: '#60a5fa', weight: 1.0 },
  { key: 'red_glasses',  name: 'Lentes rojos',  icon: 'lentes-rojos', color: '#f87171', weight: 1.0 },
  { key: 'period_log',   name: 'Registrar ciclo', icon: 'ciclo',      color: '#fb7185', weight: 1.0 },
  { key: 'nback',        name: 'N-Back',        icon: 'nback',        color: '#7F77DD', weight: 2.5 },
];

export const ALL_QUANT_OPTIONS: ElectronOption[] = [
  { key: 'protein', name: 'Proteína', icon: 'comida',      color: '#a6c8ff', weight: 2.0 },
  { key: 'steps',   name: 'Pasos',    icon: 'pasos',       color: '#ffc54c', weight: 3.0 },
  { key: 'water',   name: 'Agua',     icon: 'hidratacion', color: '#60a5fa', weight: 1.5 },
  { key: 'sleep',   name: 'Sueño',    icon: 'sueno',       color: '#818cf8', weight: 3.0 },
];
