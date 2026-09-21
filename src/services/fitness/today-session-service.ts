/**
 * Today Session service (MB-3.6 Bloque 1.2): el estado de "la sesión de hoy"
 * que protagoniza el fitness-hub (patrón Oura "one big thing").
 *
 * El motor es determinista (seed = userId|fecha|0), así que el hub puede
 * REGENERAR la rutina de hoy sin persistirla: mismas prefs + mismo día ⇒
 * misma sesión que verá el generador. Estados:
 *   · 'entrenado':  ya hay workout_session O cardio hoy → mostrar qué logró.
 *   · 'asignada':   hay rutina concreta agendada para hoy (coach o propia)
 *                   y no se ve cumplida → abrirla directo en /session.
 *   · 'lista':      hay prefs + nivel → rutina de hoy lista para empezar.
 *   · 'sin_prefs':  tiene nivel pero nunca configuró el generador.
 *   · 'primer_uso': nunca declaró nivel (onboarding de Fitness).
 *
 * 20-sep-2026: el orden lo decide today-session-core.decidirHoy. La rutina
 * agendada va ANTES de primer_uso y sin_prefs: un cliente Elite con rutina
 * asignada por su coach no tiene por qué pasar por el onboarding del
 * generador para ver SU rutina. Y un Tabata (cardio_sessions 'other') ya
 * marca el día como entrenado. Las lecturas esenciales que fallan LANZAN:
 * el hub distingue "no se pudo leer" (con reintento) de "no hay nada".
 */
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { getExerciseMatrix } from '@/src/services/fitness/exercise-matrix-service';
import { getFitnessLevel } from './fitness-profile-service';
import { loadGeneratorPrefs, type GeneratorPrefs } from './generator-prefs';
import { ayerFueSesionPesada, getSlugsRecientes } from './workout-session-service';
import { getCardioSessionsTodayResultado, type CardioSession } from '@/src/services/fitness-service';
import { generarRutina, type GeneratedRoutine, type EnfoquePatron, type Objetivo } from './routine-generator-core';
import { getAsignaciones } from './plan-semanal-service';
import { asignacionDeHoy, desplazadaDeHoy, esEnfoquePlan, type AsignacionRow } from './plan-semanal-core';
import { decidirHoy, primerNombre } from './today-session-core';
import { warn as logWarn } from '@/src/lib/logger';
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
  | {
      kind: 'entrenado';
      /** null = hoy solo hubo cardio o intervalos (no hay workout_session). */
      sesion: TodayWorkoutRow | null;
      cardioHoy: CardioSession[];
      /** Rutina agendada para hoy que no se reconoce como hecha: se ofrece
       *  en quiet, no se vuelve a exigir. */
      asignadaPendiente: AsignacionRow | null;
    }
  | {
      kind: 'asignada';
      asignacion: AsignacionRow;
      /** true = la agendó alguien que no es el usuario (su coach). */
      porCoach: boolean;
      /** Primer nombre del coach si se pudo leer; null = "tu coach". */
      coachNombre: string | null;
      /** A4: lo propio (rutina o enfoque del plan) que la del coach desplazó
       *  hoy; el hub lo dice en una línea. null si nada o si no es del coach. */
      desplazada: AsignacionRow | null;
      cardioHoy: CardioSession[];
    }
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

/** Sesión de fuerza de HOY (la más reciente si hubiera varias).
 *  20-sep-2026: una lectura fallida LANZA (antes devolvía null y el hub
 *  ofrecía "hoy toca" a quien ya había entrenado). null = de verdad no hay. */
export async function getWorkoutSessionToday(userId: string): Promise<TodayWorkoutRow | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, routine_name, exercises_count, sets_count, volume_kg, prs_count, duration_seconds')
    .eq('user_id', userId)
    .eq('date', getLocalToday())
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) {
    logWarn('[today-session] workout_sessions read failed', error);
    throw new Error('No se pudo leer tu sesión de hoy.');
  }
  if (!data || data.length === 0) return null;
  return data[0] as TodayWorkoutRow;
}

/**
 * 20-sep-2026: el primer nombre del coach que agendó la rutina, por el mismo
 * join que ya usa coach-service (coach_clients → profiles). Fail-soft: null
 * y el hero dice "tu coach". Nunca bloquea el estado del día.
 */
async function leerNombreCoach(userId: string, coachId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('coach_clients')
      .select('coach_id, coach:profiles!coach_clients_coach_id_fkey(full_name)')
      .eq('client_id', userId)
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const fila = data[0] as { coach?: { full_name?: string | null } | { full_name?: string | null }[] | null };
    const coach = Array.isArray(fila.coach) ? fila.coach[0] : fila.coach;
    return primerNombre(coach?.full_name ?? null);
  } catch {
    return null;
  }
}

/**
 * Ronda de arreglos (agenda): lo que la agenda necesita de "hoy" SIN generar
 * la rutina. `getTodayFitnessState` en estado 'lista' regenera la sesión del
 * día (catálogo + recientes + ayer pesado + generador: hasta 9 lecturas) y la
 * agenda la descartaba. Aquí solo se leen asignaciones, sesión y cardio de
 * hoy y el nombre del coach; la decisión es la MISMA (decidirHoy) y los
 * estados del generador ('lista', 'sin_prefs', 'primer_uso') colapsan en
 * 'nada' porque la agenda no los pinta.
 */
export type AsignacionHoyLigera =
  | { kind: 'asignada'; asignacion: AsignacionRow; porCoach: boolean; coachNombre: string | null }
  | { kind: 'entrenado'; sesion: TodayWorkoutRow | null; cardioHoy: CardioSession[]; asignadaPendiente: AsignacionRow | null }
  | { kind: 'nada' };

export async function leerAsignacionDeHoyLigera(userId: string): Promise<AsignacionHoyLigera> {
  const [sesion, cardioRes, asignaciones] = await Promise.all([
    getWorkoutSessionToday(userId),
    getCardioSessionsTodayResultado(userId),
    getAsignaciones(userId),
  ]);
  // Mismas reglas 7 que el hub: lo esencial que no se pudo leer LANZA.
  if (!cardioRes.ok) throw new Error('No se pudo leer tu sesión de hoy.');
  if (asignaciones === null) throw new Error('No se pudo leer tu plan de hoy.');
  const cardioHoy = cardioRes.sesiones;
  const hoy = getLocalToday();
  const asignacion = asignacionDeHoy(asignaciones, hoy);
  const desplazada = desplazadaDeHoy(asignaciones, hoy);
  // nivel/prefs no se leen: solo deciden entre los estados del generador, que
  // aquí son todos 'nada'.
  const decision = decidirHoy({
    userId, sesion, cardioHoy, nivel: null, tienePrefs: false, asignacion, desplazada,
  });
  if (decision.kind === 'entrenado') {
    return { kind: 'entrenado', sesion, cardioHoy, asignadaPendiente: decision.asignadaPendiente };
  }
  if (decision.kind === 'asignada') {
    const coachNombre = decision.porCoach && decision.asignacion.assigned_by
      ? await leerNombreCoach(userId, decision.asignacion.assigned_by)
      : null;
    return { kind: 'asignada', asignacion: decision.asignacion, porCoach: decision.porCoach, coachNombre };
  }
  return { kind: 'nada' };
}

export async function getTodayFitnessState(userId: string): Promise<TodayFitnessState> {
  const [sesion, cardioRes, nivelPerfil, prefs, asignaciones] = await Promise.all([
    getWorkoutSessionToday(userId),
    getCardioSessionsTodayResultado(userId),
    getFitnessLevel(userId),
    loadGeneratorPrefs(),
    getAsignaciones(userId),
  ]);
  // A2 (20-sep-2026): el cardio de hoy es lectura ESENCIAL: decidirHoy marca
  // "entrenado" con él. Un [] por error (400, RLS, red) hacía que el hub
  // volviera a pedir EMPEZAR una rutina ya corrida en modo intervalos.
  if (!cardioRes.ok) throw new Error('No se pudo leer tu sesión de hoy.');
  const cardioHoy = cardioRes.sesiones;
  // 20-sep-2026: la asignación es lectura ESENCIAL. Para un cliente Elite la
  // rutina agendada es el producto: si no se pudo leer (ni del caché del
  // día), decirlo con reintento gana sobre pintar el onboarding del
  // generador como si no tuviera nada asignado.
  if (asignaciones === null) throw new Error('No se pudo leer tu plan de hoy.');
  const asignacion = asignacionDeHoy(asignaciones, getLocalToday());
  // A4: lo propio que la rutina del coach desplazó hoy (null si nada).
  const desplazada = desplazadaDeHoy(asignaciones, getLocalToday());

  // El nivel del perfil manda; el de prefs viejas solo puentea usuarios pre-224.
  const nivel = nivelPerfil ?? prefs?.nivel ?? null;

  const decision = decidirHoy({
    userId, sesion, cardioHoy, nivel, tienePrefs: prefs != null, asignacion, desplazada,
  });
  if (decision.kind === 'entrenado') {
    return { kind: 'entrenado', sesion, cardioHoy, asignadaPendiente: decision.asignadaPendiente };
  }
  if (decision.kind === 'asignada') {
    const coachNombre = decision.porCoach && decision.asignacion.assigned_by
      ? await leerNombreCoach(userId, decision.asignacion.assigned_by)
      : null;
    return {
      kind: 'asignada', asignacion: decision.asignacion, porCoach: decision.porCoach, coachNombre,
      desplazada: decision.desplazada, cardioHoy,
    };
  }
  if (decision.kind === 'primer_uso') return { kind: 'primer_uso', cardioHoy, asignacion };
  if (decision.kind === 'sin_prefs' || !nivel || !prefs) return { kind: 'sin_prefs', cardioHoy, asignacion };

  try {
    const [catalogo, ayerPesado, recientes] = await Promise.all([
      getExerciseMatrix(),
      ayerFueSesionPesada(userId),
      getSlugsRecientes(userId),
    ]);
    if (catalogo.length === 0) return { kind: 'sin_prefs', cardioHoy, asignacion };

    // Audit B5: el enfoque ASIGNADO del plan gana sobre la última pref del
    // generador: "jueves = Tracción" ya no pierde contra el full body de
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
  } catch (e) {
    // 20-sep-2026: antes degradaba a sin_prefs ("Genera tu sesión") con la
    // biblioteca sin leer. Eso es "no se pudo leer", no "no hay datos": el
    // hub lo dice y ofrece reintentar.
    logWarn('[today-session] no se pudo armar la sesión de hoy', e);
    throw new Error('No se pudo armar tu sesión de hoy.');
  }
}
