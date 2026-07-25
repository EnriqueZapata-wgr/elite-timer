/**
 * Today Session service (MB-3.6 Bloque 1.2) — el estado de "la sesión de hoy"
 * que protagoniza el fitness-hub (patrón Oura "one big thing").
 *
 * El motor es determinista (seed = userId|fecha|0), así que el hub puede
 * REGENERAR la rutina de hoy sin persistirla: mismas prefs + mismo día ⇒
 * misma sesión que verá el generador. Estados:
 *   · 'entrenado'  — ya hay workout_session hoy → mostrar qué logró.
 *   · 'lista'      — hay prefs + nivel → rutina de hoy lista para empezar.
 *   · 'sin_prefs'  — tiene nivel pero nunca configuró el generador.
 *   · 'primer_uso' — nunca declaró nivel (onboarding de Fitness).
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { getFitnessLevel } from './fitness-profile-service';
import { loadGeneratorPrefs, type GeneratorPrefs } from './generator-prefs';
import { ayerFueSesionPesada, getSlugsRecientes } from './workout-session-service';
import { getCardioSessionsToday, type CardioSession } from '@/src/services/fitness-service';
import { generarRutina, type GeneratedRoutine } from './routine-generator-core';
import type { NivelUsuario } from '@/src/constants/exercise-matrix';

export interface TodayWorkoutRow {
  id: string;
  routine_name: string | null;
  exercises_count: number;
  sets_count: number;
  volume_kg: number;
  prs_count: number;
  duration_seconds: number;
}

export type TodayFitnessState =
  | { kind: 'entrenado'; sesion: TodayWorkoutRow; cardioHoy: CardioSession[] }
  | { kind: 'lista'; rutina: GeneratedRoutine; nivel: NivelUsuario; prefs: GeneratorPrefs; cardioHoy: CardioSession[] }
  | { kind: 'sin_prefs'; cardioHoy: CardioSession[] }
  | { kind: 'primer_uso'; cardioHoy: CardioSession[] };

/** Sesión de fuerza de HOY (la más reciente si hubiera varias). */
export async function getWorkoutSessionToday(userId: string): Promise<TodayWorkoutRow | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, routine_name, exercises_count, sets_count, volume_kg, prs_count, duration_seconds')
    .eq('user_id', userId)
    .eq('date', getLocalToday())
    .order('started_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as TodayWorkoutRow;
}

export async function getTodayFitnessState(userId: string): Promise<TodayFitnessState> {
  const [sesion, cardioHoy, nivelPerfil, prefs] = await Promise.all([
    getWorkoutSessionToday(userId),
    getCardioSessionsToday(userId),
    getFitnessLevel(userId),
    loadGeneratorPrefs(),
  ]);

  if (sesion) return { kind: 'entrenado', sesion, cardioHoy };

  // El nivel del perfil manda; el de prefs viejas solo puentea usuarios pre-224.
  const nivel = nivelPerfil ?? prefs?.nivel ?? null;
  if (!nivel) return { kind: 'primer_uso', cardioHoy };
  if (!prefs) return { kind: 'sin_prefs', cardioHoy };

  try {
    const [catalogo, ayerPesado, recientes] = await Promise.all([
      getExerciseMatrix(),
      ayerFueSesionPesada(userId),
      getSlugsRecientes(userId),
    ]);
    if (catalogo.length === 0) return { kind: 'sin_prefs', cardioHoy };

    // Mismo seed |0 que la primera generada del día en el generador, con el
    // último objetivo/enfoque que el usuario usó (paridad hub ↔ generador).
    const rutina = generarRutina({
      catalogo,
      objetivo: prefs.objetivo,
      enfoque: { kind: 'patron', enfoque: prefs.enfoque },
      equipo: prefs.equipo,
      equipoUnidades: prefs.unidades,
      nivel,
      senior: prefs.senior,
      tiempoMin: prefs.tiempoMin,
      contraindicaciones: prefs.flags,
      seed: `${userId}|${getLocalToday()}|0`,
      slugsRecientes: recientes,
      ayerFuePesado: ayerPesado,
    });
    if (rutina.bloques.length === 0) return { kind: 'sin_prefs', cardioHoy };
    return { kind: 'lista', rutina, nivel, prefs, cardioHoy };
  } catch {
    return { kind: 'sin_prefs', cardioHoy };
  }
}
