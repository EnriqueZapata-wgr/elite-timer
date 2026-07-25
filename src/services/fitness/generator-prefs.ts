/**
 * Prefs persistidas del generador (MB-3.6) — módulo compartido.
 *
 * Antes vivían inline en routine-generator.tsx; ahora también las lee el hub
 * (la sesión de hoy se regenera determinista con estas prefs + el nivel del
 * perfil). El nivel dejó de ser dueño aquí: profiles.fitness_level manda
 * (fitness-profile-service); p.nivel se conserva solo como fallback legacy.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';
import type { Objetivo, EnfoquePatron } from './routine-generator-core';

export const GENERATOR_PREFS_KEY = 'fitness_generator_prefs_v1';

const OBJETIVOS_VALIDOS = ['fuerza', 'hipertrofia', 'metabolico', 'movilidad'] as const;
const ENFOQUES_VALIDOS = ['full_body', 'tren_superior', 'empuje', 'traccion', 'pierna_empuje', 'pierna_traccion'] as const;

export interface GeneratorPrefs {
  equipo: string[];
  /** Legacy (pre-224): fallback si el perfil aún no tiene nivel. */
  nivel: NivelUsuario | null;
  senior: boolean;
  tiempoMin: number;
  flags: string[];
  unidades: Partial<Record<string, '1' | 'par'>>;
  /** Último objetivo/enfoque usados — el hub regenera "hoy" con esto (paridad con el generador). */
  objetivo: Objetivo;
  enfoque: EnfoquePatron;
}

export const DEFAULT_PREFS: GeneratorPrefs = {
  equipo: ['Mancuerna'],
  nivel: null,
  senior: false,
  tiempoMin: 45,
  flags: [],
  unidades: {},
  objetivo: 'hipertrofia',
  enfoque: 'full_body',
};

/** null = el usuario NUNCA ha pasado por el generador (no hay base para "hoy toca"). */
export async function loadGeneratorPrefs(): Promise<GeneratorPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(GENERATOR_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      equipo: Array.isArray(p.equipo) ? p.equipo : DEFAULT_PREFS.equipo,
      nivel: p.nivel && (NIVELES_USUARIO as readonly string[]).includes(p.nivel) ? p.nivel : null,
      senior: typeof p.senior === 'boolean' ? p.senior : false,
      tiempoMin: typeof p.tiempoMin === 'number' ? p.tiempoMin : DEFAULT_PREFS.tiempoMin,
      flags: Array.isArray(p.flags) ? p.flags : [],
      unidades: p.unidades && typeof p.unidades === 'object' ? p.unidades : {},
      objetivo: (OBJETIVOS_VALIDOS as readonly string[]).includes(p.objetivo) ? p.objetivo : DEFAULT_PREFS.objetivo,
      enfoque: (ENFOQUES_VALIDOS as readonly string[]).includes(p.enfoque) ? p.enfoque : DEFAULT_PREFS.enfoque,
    };
  } catch {
    return null; // prefs corruptas → como si no existieran
  }
}

export async function saveGeneratorPrefs(prefs: GeneratorPrefs): Promise<void> {
  await AsyncStorage.setItem(GENERATOR_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
}
