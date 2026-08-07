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
import { generarRutina, type GeneratedRoutine, type EnfoquePatron, type Objetivo } from './routine-generator-core';
import { getAsignaciones } from './plan-semanal-service';
import { asignacionDeHoy, esEnfoquePlan, type AsignacionRow } from './plan-semanal-core';
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
  | {
      kind: 'lista'; rutina: GeneratedRoutine; nivel: NivelUsuario; prefs: GeneratorPrefs; cardioHoy: CardioSession[];
      /** Audit B5: la asignación del día (plan propio o rutina agendada). */
      asignacion: AsignacionRow | null;
      /** Con qué se generó DE VERDAD (la asignación manda sobre la pref). */
      enfoqueUsado: EnfoquePatron;
      objetivoUsado: Objetivo;
    }
  | { kind: 'sin_prefs'; cardioHoy: CardioSession[]; asignacion: AsignacionRow | null }
  | { kind: 'primer_uso'; cardioHoy: CardioSession[]; asignacion: AsignacionRow | null };

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
  const [sesion, cardioHoy, nivelPerfil, prefs, asignaciones] = await Promise.all([
    getWorkoutSessionToday(userId),
    getCardioSessionsToday(userId),
    getFitnessLevel(userId),
    loadGeneratorPrefs(),
    getAsignaciones(userId).catch(() => null),
  ]);
  // Audit B5: la asignación del día manda en la puerta REAL (este hub es la
  // ruta de la app Entrenar). Lectura fallida = null: todo como siempre.
  const asignacion = asignacionDeHoy(asignaciones, getLocalToday());

  if (sesion) return { kind: 'entrenado', sesion, cardioHoy };

  // El nivel del perfil manda; el de prefs viejas solo puentea usuarios pre-224.
  const nivel = nivelPerfil ?? prefs?.nivel ?? null;
  if (!nivel) return { kind: 'primer_uso', cardioHoy, asignacion };
  if (!prefs) return { kind: 'sin_prefs', cardioHoy, asignacion };

  try {
    const [catalogo, ayerPesado, recientes] = await Promise.all([
      getExerciseMatrix(),
      ayerFueSesionPesada(userId),
      getSlugsRecientes(userId),
    ]);
    if (catalogo.length === 0) return { kind: 'sin_prefs', cardioHoy, asignacion };

    // Audit B5: el enfoque ASIGNADO del plan gana sobre la última pref del
    // generador — "jueves = Tracción" ya no pierde contra el full body de
    // ayer. Y si la pref de objetivo quedó en movilidad (que ignora el
    // enfoque), un día con enfoque asignado genera hipertrofia: el hero no
    // puede anunciar Tracción y armar movilidad de cuerpo completo.
    const enfoqueAsignado: EnfoquePatron | null =
      asignacion?.focus && esEnfoquePlan(asignacion.focus) ? asignacion.focus : null;
    const objetivoUsado: Objetivo =
      enfoqueAsignado && prefs.objetivo === 'movilidad' ? 'hipertrofia' : prefs.objetivo;
    const enfoqueUsado: EnfoquePatron = enfoqueAsignado ?? prefs.enfoque;

    // Mismo seed |0 que la primera generada del día en el generador (que
    // recibe el mismo enfoque vía deep-link): paridad hub ↔ generador.
    const rutina = generarRutina({
      catalogo,
      objetivo: objetivoUsado,
      enfoque: { kind: 'patron', enfoque: enfoqueUsado },
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
    if (rutina.bloques.length === 0) return { kind: 'sin_prefs', cardioHoy, asignacion };
    return { kind: 'lista', rutina, nivel, prefs, cardioHoy, asignacion, enfoqueUsado, objetivoUsado };
  } catch {
    return { kind: 'sin_prefs', cardioHoy, asignacion };
  }
}
