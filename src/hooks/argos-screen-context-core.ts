/**
 * ARGOS Screen Context — lógica pura (T4 Sprint MAGIA ARGOS).
 *
 * Deriva "en qué pantalla está el usuario" desde el pathname de expo-router y
 * produce (a) un id de pantalla canónico, (b) una etiqueta humana y (c) un hint
 * de una línea que se inyecta en el system prompt para que ARGOS sepa el
 * contexto ("Vi que estás en Nutrición…").
 *
 * Separado del hook para testear sin montar expo-router (convención del repo:
 * lógica pura en *-core.ts). Datos ricos por pantalla (electrones, macros…) son
 * runtime/#92 — fuera de scope; aquí solo el mapa de pantalla.
 */

export type ArgosScreen =
  | 'hoy'
  | 'nutrition'
  | 'fitness'
  | 'mind'
  | 'health'
  | 'cycle'
  | 'argos'
  | 'other';

export interface ArgosScreenContext {
  screen: ArgosScreen;
  /** Etiqueta legible del pilar/pantalla. */
  label: string;
}

/**
 * Mapea un pathname de expo-router a una pantalla ARGOS canónica. Tolera
 * variantes de ruta (tabs, deep-links, sub-rutas) por prefijo/keyword.
 */
export function screenFromPath(pathname: string | null | undefined): ArgosScreen {
  if (!pathname) return 'other';
  const p = pathname.toLowerCase();

  // El chat de ARGOS mismo — el floating no aporta contexto aquí.
  if (p.includes('argos')) return 'argos';

  // HOY es la home de tabs: '/', '/(tabs)', '/index'.
  if (p === '/' || p === '/index' || p.includes('(tabs)') || p.endsWith('/hoy')) return 'hoy';

  if (p.includes('nutrition') || p.includes('food') || p.includes('fasting') || p.includes('hydration')) {
    return 'nutrition';
  }
  if (p.includes('fitness') || p.includes('training') || p.includes('routine') || p.includes('execution') || p.includes('timer')) {
    return 'fitness';
  }
  if (p.includes('mind') || p.includes('journal') || p.includes('breathing') || p.includes('meditation') || p.includes('checkin')) {
    return 'mind';
  }
  if (p.includes('health') || p.includes('clinical') || p.includes('glucose') || p.includes('labs') || p.includes('edad-atp') || p.includes('protocol')) {
    return 'health';
  }
  if (p.includes('cycle')) return 'cycle';

  return 'other';
}

const LABELS: Record<ArgosScreen, string> = {
  hoy: 'HOY',
  nutrition: 'Nutrición',
  fitness: 'Fitness',
  mind: 'Mente',
  health: 'Salud',
  cycle: 'Ciclo',
  argos: 'ARGOS',
  other: 'la app',
};

const VALID_SCREENS = new Set<ArgosScreen>([
  'hoy', 'nutrition', 'fitness', 'mind', 'health', 'cycle', 'argos', 'other',
]);

/** Valida un string arbitrario (ej. route param) como ArgosScreen. */
export function coerceScreen(value: string | null | undefined): ArgosScreen | undefined {
  if (value && VALID_SCREENS.has(value as ArgosScreen)) return value as ArgosScreen;
  return undefined;
}

export function buildScreenContext(screen: ArgosScreen): ArgosScreenContext {
  return { screen, label: LABELS[screen] };
}

/** Atajo pathname → contexto. */
export function screenContextFromPath(pathname: string | null | undefined): ArgosScreenContext {
  return buildScreenContext(screenFromPath(pathname));
}

/**
 * Inyección de CONTEXTO DE PANTALLA para el system prompt. Le dice a ARGOS qué
 * está mirando el usuario para que pueda referirlo. Vacío para 'argos'/'other'
 * (no aporta). Directriz para el modelo, no copy visible.
 */
export function buildScreenContextInjection(screen: ArgosScreen | undefined): string {
  if (!screen || screen === 'argos' || screen === 'other') return '';
  const label = LABELS[screen];
  return `\n\n## CONTEXTO DE PANTALLA\nEl usuario abrió esta conversación desde ${label}. Si es natural, reconoce dónde está ("vi que estás en ${label}…") y orienta tu respuesta a ese pilar sin forzarlo.`;
}
