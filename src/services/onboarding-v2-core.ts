/**
 * Onboarding v2 — núcleo PURO (sin react-native/supabase), testeable con vitest.
 *
 * F2 sprint UX blockers V1.3: flujo de 7 pantallas que reemplaza al motor v1
 * de 9 bloques. El step persiste en profiles.onboarding_step con valores
 * 'v2_<step>' (columna TEXT sin CHECK — no requiere migración para el step).
 *
 *   welcome → positioning → privacy → profile → goal → cycle → chronotype → consent → notifications → completed
 *
 * Sprint Compliance 2: 'privacy' es el muro de consentimiento (Aviso de
 * Privacidad Parte 3: CB-2/3/4 obligatorios + CB-5 opcional), ANTES de
 * capturar datos sensibles. CB-1 vive en register.tsx (bloquea la cuenta).
 * Sprint Compliance 4: 'positioning' presenta el posicionamiento "optimizar
 * sanos" (§2 versión precisa) ANTES del consentimiento — el usuario entiende
 * qué es ATP (y qué NO es) antes de otorgar nada.
 *
 * El tour post-onboarding NO es un step: AppTour se auto-dispara en la primera
 * visita a HOY (AsyncStorage @atp/tour_completed), igual que antes.
 */
// Type-only: se borra en compilación — el núcleo sigue siendo puro para vitest.
import type { Href } from 'expo-router';

export const V2_STEPS = [
  'welcome',
  'positioning',
  'privacy',
  'profile',
  'goal',
  'cycle',
  'chronotype',
  'consent',
  'notifications',
] as const;

export type V2Step = (typeof V2_STEPS)[number];

export function isV2Step(s: string): s is V2Step {
  return (V2_STEPS as readonly string[]).includes(s);
}

/** Ruta de la pantalla de un step. */
export function v2Route(step: V2Step): Href {
  return `/onboarding/v2/${step}`;
}

/** Step siguiente, o null si `step` es el último (→ completed). */
export function nextV2Step(step: V2Step): V2Step | null {
  const i = V2_STEPS.indexOf(step);
  return i >= 0 && i < V2_STEPS.length - 1 ? V2_STEPS[i + 1] : null;
}

/** Step anterior, o null si es el primero. */
export function prevV2Step(step: V2Step): V2Step | null {
  const i = V2_STEPS.indexOf(step);
  return i > 0 ? V2_STEPS[i - 1] : null;
}

/** Número de paso 1-based para el shell (PASO n DE 7). */
export function v2StepNumber(step: V2Step): number {
  return V2_STEPS.indexOf(step) + 1;
}

/**
 * Resuelve la ruta de onboarding desde el valor persistido en
 * profiles.onboarding_step. null = onboarding terminado (ir a tabs).
 *
 * - 'completed' → null.
 * - 'v2_<step>' → la pantalla de ese step (el valor guardado es el step
 *   PENDIENTE, no el completado).
 * - Valores legacy v1 (basics/goal/…/voice_config/pending) o desconocidos →
 *   reiniciar en v2 welcome. Los datos ya capturados en v1 persisten en
 *   profiles/client_profiles y las pantallas v2 los prefillan.
 */
export function resolveOnboardingRoute(step: string | null | undefined): Href | null {
  if (step === 'completed') return null;
  if (step && step.startsWith('v2_')) {
    const s = step.slice(3);
    if (isV2Step(s)) return v2Route(s);
  }
  return v2Route('welcome');
}

// ═══ Modalidad de ciclo (task #111) ═══

export type CycleModality =
  | 'regular'      // ciclo regular (default mujer)
  | 'pregnancy'    // embarazo (activará máscara global — task #85)
  | 'menopause'    // perimenopausia / menopausia
  | 'no_cycle'     // sin ciclo (SOP, histerectomía, etc.)
  | 'partner'      // hombre: vinculado con pareja (companion insights)
  | 'disabled';    // hombre: módulo Ciclo desactivado (default hombre)

export interface CycleModalityOption {
  value: CycleModality;
  label: string;
  description: string;
  icon: string;
}

const FEMALE_MODALITIES: CycleModalityOption[] = [
  { value: 'regular', label: 'Ciclo regular', description: 'Seguimiento completo de tu ciclo menstrual', icon: 'sync-outline' },
  { value: 'pregnancy', label: 'Embarazo', description: 'Modo embarazo — la app adapta recomendaciones', icon: 'heart-outline' },
  { value: 'menopause', label: 'Perimenopausia / Menopausia', description: 'Seguimiento de síntomas sin predicción de ciclo', icon: 'flower-outline' },
  { value: 'no_cycle', label: 'Sin ciclo', description: 'SOP, histerectomía u otra condición sin ciclo regular', icon: 'remove-circle-outline' },
];

const MALE_MODALITIES: CycleModalityOption[] = [
  { value: 'disabled', label: 'Desactivar módulo Ciclo', description: 'No verás el módulo de ciclo menstrual', icon: 'eye-off-outline' },
  { value: 'partner', label: 'Vincular con mi pareja', description: 'Insights de compañero sobre el ciclo de tu pareja', icon: 'people-outline' },
];

/** Opciones de modalidad según sexo biológico. */
export function cycleModalityOptions(sex: 'male' | 'female'): CycleModalityOption[] {
  return sex === 'female' ? FEMALE_MODALITIES : MALE_MODALITIES;
}

/** Default por sexo (mujer → regular, hombre → disabled). */
export function defaultCycleModality(sex: 'male' | 'female'): CycleModality {
  return sex === 'female' ? 'regular' : 'disabled';
}

// ═══ Cronotipo rápido (5 preguntas, port del scoring v1) ═══

export type Chronotype = 'lion' | 'bear' | 'wolf' | 'dolphin';

export interface ChronoQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
}

/** 5 preguntas (subset del quiz v1 de 7 — spec F2: "test 4-5 preguntas"). */
export const CHRONO_QUESTIONS: ChronoQuestion[] = [
  {
    id: 'q1',
    text: 'Sin alarma, ¿a qué hora despertarías?',
    options: [
      { id: 'a', text: 'Antes de las 6' },
      { id: 'b', text: '6 a 7' },
      { id: 'c', text: '7 a 8:30' },
      { id: 'd', text: 'Después de las 8:30' },
    ],
  },
  {
    id: 'q2',
    text: '¿Cuándo es tu pico de energía mental?',
    options: [
      { id: 'a', text: 'Mañana temprano (6-9)' },
      { id: 'b', text: 'Media mañana (9-1)' },
      { id: 'c', text: 'Tarde (2-6)' },
      { id: 'd', text: 'Noche (7-11)' },
    ],
  },
  {
    id: 'q3',
    text: '¿Cuándo preferirías entrenar?',
    options: [
      { id: 'a', text: 'Amanecer (5-7)' },
      { id: 'b', text: 'Mañana (7-10)' },
      { id: 'c', text: 'Tarde (4-7)' },
      { id: 'd', text: 'Me da igual' },
    ],
  },
  {
    id: 'q4',
    text: '¿Cómo es tu sueño?',
    options: [
      { id: 'a', text: 'Me duermo fácil, despierto antes de alarma' },
      { id: 'b', text: 'Duermo bien, necesito alarma' },
      { id: 'c', text: 'Me cuesta dormirme y despertar' },
      { id: 'd', text: 'Sueño ligero, despierto fácil' },
    ],
  },
  {
    id: 'q6',
    text: 'Fin de semana libre, ¿qué haces?',
    options: [
      { id: 'a', text: 'Madrugo igual' },
      { id: 'b', text: 'Día balanceado' },
      { id: 'c', text: 'Duermo hasta tarde' },
      { id: 'd', text: 'Despierto temprano aunque no quiera' },
    ],
  },
];

// Scoring idéntico al v1 para las preguntas incluidas.
type ScoreMap = Record<string, Record<Chronotype, number>>;
const CHRONO_SCORES: Record<string, ScoreMap> = {
  q1: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 2 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 1 },
    d: { lion: 0, bear: 0, wolf: 2, dolphin: 0 },
  },
  q2: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 2 },
    c: { lion: 0, bear: 1, wolf: 2, dolphin: 1 },
    d: { lion: 0, bear: 0, wolf: 3, dolphin: 0 },
  },
  q3: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 1 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 1 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 1, wolf: 0, dolphin: 2 },
  },
  q4: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 1, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 1, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
  q6: {
    a: { lion: 3, bear: 0, wolf: 0, dolphin: 0 },
    b: { lion: 0, bear: 3, wolf: 0, dolphin: 0 },
    c: { lion: 0, bear: 0, wolf: 3, dolphin: 0 },
    d: { lion: 0, bear: 0, wolf: 0, dolphin: 3 },
  },
};

export function computeChronotype(answers: Record<string, string>): Chronotype {
  const totals: Record<Chronotype, number> = { lion: 0, bear: 0, wolf: 0, dolphin: 0 };
  for (const [qId, scoreMap] of Object.entries(CHRONO_SCORES)) {
    const answer = answers[qId];
    if (!answer || !scoreMap[answer]) continue;
    const s = scoreMap[answer];
    totals.lion += s.lion;
    totals.bear += s.bear;
    totals.wolf += s.wolf;
    totals.dolphin += s.dolphin;
  }
  let best: Chronotype = 'bear';
  let bestScore = -1;
  for (const [key, val] of Object.entries(totals)) {
    if (val > bestScore) { bestScore = val; best = key as Chronotype; }
  }
  return best;
}

export interface ChronoSchedule {
  wake: string;
  sleep: string;
  peak_physical: string;
  peak_focus_start: string;
  peak_focus_end: string;
  wind_down: string;
}

/** Horarios recomendados por cronotipo (idéntico al v1 — user_chronotype). */
// HOTFIX 1.5: León wake 06:00 (doctrina Sprint 1.5, antes 05:30) — en espejo
// con CHRONO_ANCHOR_DEFAULTS (agenda) + data fix de user_chronotype ya escritos.
export const CHRONO_SCHEDULES: Record<Chronotype, ChronoSchedule> = {
  lion:    { wake: '06:00', sleep: '21:30', peak_physical: '06:30', peak_focus_start: '08:00', peak_focus_end: '12:00', wind_down: '20:30' },
  bear:    { wake: '07:00', sleep: '23:00', peak_physical: '07:30', peak_focus_start: '10:00', peak_focus_end: '14:00', wind_down: '22:00' },
  wolf:    { wake: '08:00', sleep: '00:00', peak_physical: '17:00', peak_focus_start: '17:00', peak_focus_end: '21:00', wind_down: '23:00' },
  dolphin: { wake: '06:30', sleep: '23:30', peak_physical: '15:00', peak_focus_start: '10:00', peak_focus_end: '12:00', wind_down: '22:00' },
};

export const CHRONO_META: Record<Chronotype, { emoji: string; name: string; blurb: string }> = {
  lion:    { emoji: '🦁', name: 'León', blurb: 'Madrugador nato. Tu pico es temprano — protege tus mañanas.' },
  bear:    { emoji: '🐻', name: 'Oso', blurb: 'Ritmo solar clásico. Media mañana es tu zona de poder.' },
  wolf:    { emoji: '🐺', name: 'Lobo', blurb: 'Nocturno. Tu energía despega por la tarde-noche.' },
  dolphin: { emoji: '🐬', name: 'Delfín', blurb: 'Sueño ligero. La consistencia de horarios es tu palanca.' },
};

// ═══ Objetivo principal (spec F2: 5 opciones) ═══

export const GOAL_OPTIONS = [
  { id: 'longevity', text: 'Longevidad — optimizar mi salud a largo plazo', icon: 'heart-outline' },
  { id: 'body_composition', text: 'Composición corporal — grasa y músculo', icon: 'body-outline' },
  { id: 'energy', text: 'Energía — rendir más todos los días', icon: 'flash-outline' },
  { id: 'sport_performance', text: 'Deporte — rendimiento atlético', icon: 'barbell-outline' },
  { id: 'event_prep', text: 'Preparación — un evento o meta específica', icon: 'flag-outline' },
] as const;
