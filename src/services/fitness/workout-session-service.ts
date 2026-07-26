/**
 * Workout Session service (MB-3 Track D) — persistencia de la sesión de fuerza.
 *
 * Camino de escritura ADITIVO sobre el existente: los sets siguen siendo filas
 * de `exercise_logs` (historial, stats de la semana y PR-trigger intactos),
 * ahora agrupadas bajo `workout_sessions` vía session_id, y trazadas al
 * catálogo matriceado vía matrix_slug + exercises.matrix_slug.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/utils/uuid';
import { processEdadSignal, type EdadSignal } from './edad-bridge-service';
import {
  computeSessionSummary,
  computePRUpdates,
  epley1RM,
  type SessionSet,
  type PRUpdate,
} from './workout-session-core';

export interface SaveSessionInput {
  userId: string;
  sets: SessionSet[];
  startedAt: Date;
  endedAt: Date;
  source: 'generada' | 'manual';
  routineName?: string;
  /** Snapshot del plan generado (GeneratedRoutine) — para repetir/auditar. */
  plan?: unknown;
  /**
   * MB-5 0.2: id estable para reintentos idempotentes — mismo id ⇒ upsert de
   * workout_sessions (no duplica la sesión) y re-escritura limpia de sus logs.
   */
  sessionId?: string;
}

export interface SaveSessionResult {
  ok: boolean;
  sessionId?: string;
  summary?: { exercisesCount: number; setsCount: number; volumeKg: number; durationSeconds: number };
  prs?: PRUpdate[];
  edadSignal?: EdadSignal;
  /** MB-3.6 §3.3: cardio de HOY adoptado por esta sesión (fuerza+cardio = un día). */
  cardioHoy?: { discipline: string; durationSeconds: number; distanceMeters: number | null }[];
  error?: string;
}

/**
 * Garantiza una fila en `exercises` por slug de la matriz (el registro y los
 * PRs viven ahí). Match por matrix_slug; si no existe, match por nombre exacto
 * (adopta la fila y le fija matrix_slug); si no, la crea.
 */
async function ensureExerciseIds(
  sets: Pick<SessionSet, 'slug' | 'nombre'>[],
): Promise<Record<string, string>> {
  const porSlug = new Map<string, string>(); // slug → nombre
  for (const s of sets) if (!porSlug.has(s.slug)) porSlug.set(s.slug, s.nombre);
  const slugs = [...porSlug.keys()];
  const out: Record<string, string> = {};
  if (slugs.length === 0) return out;

  const { data: existentes, error } = await supabase
    .from('exercises')
    .select('id, matrix_slug')
    .in('matrix_slug', slugs);
  if (error) throw new Error(`exercises lookup: ${error.message}`);
  for (const row of (existentes ?? []) as { id: string; matrix_slug: string }[]) {
    out[row.matrix_slug] = row.id;
  }

  for (const slug of slugs) {
    if (out[slug]) continue;
    const nombre = porSlug.get(slug)!;
    // Adopta un ejercicio existente con el mismo nombre (evita duplicar
    // benchmarks históricos); si no hay, crea la fila nueva.
    const { data: porNombre } = await supabase
      .from('exercises')
      .select('id, matrix_slug')
      .or(`name.eq.${JSON.stringify(nombre)},name_es.eq.${JSON.stringify(nombre)}`)
      .is('matrix_slug', null)
      .limit(1);
    const candidato = (porNombre ?? [])[0] as { id: string } | undefined;
    if (candidato) {
      const { error: updErr } = await supabase
        .from('exercises')
        .update({ matrix_slug: slug })
        .eq('id', candidato.id);
      if (!updErr) { out[slug] = candidato.id; continue; }
    }
    const id = generateUUID();
    const { error: insErr } = await supabase.from('exercises').insert({
      id,
      name: nombre,
      name_es: nombre,
      is_benchmark: false,
      parent_exercise_id: null,
      muscle_groups: [],
      equipment_list: [],
      instructions: null,
      matrix_slug: slug,
    });
    if (insErr) {
      // Carrera con otro dispositivo: re-lee por matrix_slug.
      const { data: retry } = await supabase
        .from('exercises').select('id').eq('matrix_slug', slug).maybeSingle();
      if (retry) { out[slug] = (retry as { id: string }).id; continue; }
      throw new Error(`exercises insert: ${insErr.message}`);
    }
    out[slug] = id;
  }
  return out;
}

/**
 * MB-5 2.1: fila en `exercises` para un ejercicio de la matriz (la adopta o
 * crea si falta) — el constructor la usa para que sus bloques traceados
 * tengan también FK clásica. Fail-soft: null si no se pudo (offline).
 */
export async function ensureExerciseId(slug: string, nombre: string): Promise<string | null> {
  try {
    const ids = await ensureExerciseIds([{ slug, nombre }]);
    return ids[slug] ?? null;
  } catch (e) {
    logWarn('[workout-session] ensureExerciseId:', e);
    return null;
  }
}

/** PR previo (mejor 1RM) por slug, para detectar mejoras de ESTA sesión. */
async function getPrev1RMs(userId: string, exerciseIdBySlug: Record<string, string>): Promise<Record<string, number>> {
  const ids = Object.values(exerciseIdBySlug);
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_id, estimated_1rm')
    .eq('user_id', userId)
    .in('exercise_id', ids);
  if (error) { logWarn('[workout-session] getPrev1RMs failed:', error.message); return {}; }
  const bestById: Record<string, number> = {};
  for (const r of (data ?? []) as { exercise_id: string; estimated_1rm: number }[]) {
    if (r.estimated_1rm != null && (!bestById[r.exercise_id] || r.estimated_1rm > bestById[r.exercise_id])) {
      bestById[r.exercise_id] = r.estimated_1rm;
    }
  }
  const out: Record<string, number> = {};
  for (const [slug, id] of Object.entries(exerciseIdBySlug)) {
    if (bestById[id] != null) out[slug] = bestById[id];
  }
  return out;
}

/**
 * Guarda la sesión completa: workout_sessions + exercise_logs (con session_id
 * y matrix_slug) + upsert de PRs + señal Edad ATP (Track C, fail-soft).
 */
export async function saveWorkoutSession(input: SaveSessionInput): Promise<SaveSessionResult> {
  const validSets = input.sets.filter((s) => s.reps > 0);
  if (validSets.length === 0) return { ok: false, error: 'Sesión sin sets válidos.' };
  try {
    const exerciseIdBySlug = await ensureExerciseIds(validSets);
    const prev1RMs = await getPrev1RMs(input.userId, exerciseIdBySlug);

    const summary = computeSessionSummary(validSets);
    const prs = computePRUpdates(validSets, prev1RMs);
    const durationSeconds = Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000));
    const sessionId = input.sessionId ?? generateUUID();
    // Fecha DE LA SESIÓN, no del guardado: en el camino normal endedAt es ahora
    // (idéntico a getLocalToday); en un reintento diferido (0.2) conserva el
    // día real del entrenamiento.
    const today = toLocalDateString(input.endedAt);
    const nowIso = input.endedAt.toISOString();

    // La señal Edad ATP se procesa ANTES del insert de la sesión para poder
    // persistir el snapshot en edad_signal (fail-soft: si truena, va null).
    const edadSignal = await processEdadSignal(
      input.userId,
      validSets.map((s) => ({ slug: s.slug, reps: s.reps, weightKg: s.weightKg, distanceCm: s.distanceCm ?? null })),
    );

    // Upsert por id: un reintento (mismo sessionId) actualiza la fila del
    // intento fallido en vez de duplicar la sesión.
    const { error: sesErr } = await supabase.from('workout_sessions').upsert({
      id: sessionId,
      user_id: input.userId,
      date: today,
      started_at: input.startedAt.toISOString(),
      ended_at: nowIso,
      duration_seconds: durationSeconds,
      source: input.source,
      routine_name: input.routineName ?? null,
      plan: input.plan ?? null,
      exercises_count: summary.exercisesCount,
      sets_count: summary.setsCount,
      volume_kg: summary.volumeKg,
      prs_count: prs.length,
      edad_signal: {
        alimentado: edadSignal.alimentado,
        proyeccion_years: edadSignal.proyeccion?.years ?? null,
      },
    }, { onConflict: 'id' });
    if (sesErr) throw new Error(`workout_sessions insert: ${sesErr.message}`);

    // Reintento: limpia logs de un intento anterior parcialmente subido antes
    // de re-insertar (fail-soft — si no hay nada que borrar, sigue).
    if (input.sessionId) {
      const { error: delErr } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('user_id', input.userId)
        .eq('session_id', sessionId);
      if (delErr) logWarn('[workout-session] limpieza pre-reintento:', delErr.message);
    }

    const rows = validSets.map((s) => ({
      id: generateUUID(),
      user_id: input.userId,
      exercise_id: exerciseIdBySlug[s.slug],
      session_id: sessionId,
      matrix_slug: s.slug,
      set_number: s.setNumber,
      reps: s.reps,
      weight_kg: s.weightKg,
      rir: null,
      rpe: null,
      logged_at: nowIso,
      date: today,
      metadata: {
        method: s.metodo,
        slot: s.slot ?? null,
        isometric: s.esIsometrico,
        // MB-3.6 Bloque 5: benchmarks de distancia (broad jump) guardan cm.
        ...(s.distanceCm != null ? { distance_cm: s.distanceCm } : {}),
      },
    }));
    const { error: logsErr } = await supabase.from('exercise_logs').insert(rows);
    if (logsErr) throw new Error(`exercise_logs insert: ${logsErr.message}`);

    // Upsert de PRs (mismo criterio Epley/onConflict que log-exercise).
    for (const pr of prs) {
      const { error: prErr } = await supabase.from('personal_records').upsert({
        user_id: input.userId,
        exercise_id: exerciseIdBySlug[pr.slug],
        weight_kg: pr.weightKg,
        rep_range: pr.reps,
        estimated_1rm: pr.new1RM,
        achieved_at: nowIso,
      }, { onConflict: 'user_id,exercise_id' });
      if (prErr) logWarn('[workout-session] PR upsert failed:', prErr.message);
    }

    // MB-3.6 §3.3: la sesión del día ADOPTA el cardio de hoy (link aditivo,
    // mig 225 workout_session_id) — fuerza + cardio son UN día de entrenamiento.
    // Fail-soft: si la columna aún no existe en el remoto, el cierre solo omite
    // la sección de cardio.
    let cardioHoy: SaveSessionResult['cardioHoy'];
    try {
      const { data: cardios } = await supabase
        .from('cardio_sessions')
        .select('id, discipline, duration_seconds, distance_meters')
        .eq('user_id', input.userId)
        .eq('date', today);
      if (cardios && cardios.length > 0) {
        cardioHoy = (cardios as { id: string; discipline: string; duration_seconds: number | null; distance_meters: number | null }[])
          .map((c) => ({
            discipline: c.discipline,
            durationSeconds: c.duration_seconds ?? 0,
            distanceMeters: c.distance_meters,
          }));
        const { error: linkErr } = await supabase
          .from('cardio_sessions')
          .update({ workout_session_id: sessionId })
          .eq('user_id', input.userId)
          .eq('date', today)
          .is('workout_session_id', null);
        if (linkErr) logWarn('[workout-session] link cardio (¿mig 225 sin aplicar?):', linkErr.message);
      }
    } catch (e) {
      logWarn('[workout-session] cardio del día:', e);
    }

    return {
      ok: true,
      sessionId,
      summary: { ...summary, durationSeconds },
      prs,
      edadSignal,
      cardioHoy,
    };
  } catch (err) {
    logWarn('[workout-session] saveWorkoutSession failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'No se pudo guardar la sesión.' };
  }
}

// ── Sesiones pendientes (MB-5 0.2: el trabajo del usuario es sagrado) ──
//
// Si el guardado falla (red, esquema), la sesión completa se persiste en el
// teléfono y se reintenta después. El sessionId estable + upsert de arriba
// hacen el reintento idempotente (cero duplicados).

const PENDING_SESSIONS_KEY = 'pending_workout_sessions_v1';

interface PendingSession {
  sessionId: string;
  userId: string;
  sets: SessionSet[];
  startedAtIso: string;
  endedAtIso: string;
  source: 'generada' | 'manual';
  routineName?: string;
  plan?: unknown;
}

async function readPending(): Promise<PendingSession[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePending(list: PendingSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(list));
  } catch (e) {
    logWarn('[workout-session] writePending:', e);
  }
}

/** Persiste la sesión localmente para reintentar después (reemplaza por sessionId). */
export async function stashPendingSession(input: SaveSessionInput & { sessionId: string }): Promise<void> {
  const list = await readPending();
  const entry: PendingSession = {
    sessionId: input.sessionId,
    userId: input.userId,
    sets: input.sets,
    startedAtIso: input.startedAt.toISOString(),
    endedAtIso: input.endedAt.toISOString(),
    source: input.source,
    routineName: input.routineName,
    plan: input.plan,
  };
  await writePending([...list.filter((p) => p.sessionId !== input.sessionId), entry]);
}

/** Saca una sesión de la cola local (tras guardado exitoso). */
export async function removePendingSession(sessionId: string): Promise<void> {
  const list = await readPending();
  if (list.some((p) => p.sessionId === sessionId)) {
    await writePending(list.filter((p) => p.sessionId !== sessionId));
  }
}

/**
 * Reintenta subir las sesiones pendientes del usuario. Silencioso y fail-soft:
 * las que suben salen de la cola; las que fallan se quedan para la próxima.
 * Otorga el electrón de strength SOLO si la sesión recuperada es de HOY
 * (cero retroactividad — misma doctrina que el import de cardio).
 */
export async function flushPendingSessions(userId: string): Promise<number> {
  const list = await readPending();
  const propias = list.filter((p) => p.userId === userId);
  if (propias.length === 0) return 0;
  let guardadas = 0;
  for (const p of propias) {
    const res = await saveWorkoutSession({
      userId: p.userId,
      sets: p.sets,
      startedAt: new Date(p.startedAtIso),
      endedAt: new Date(p.endedAtIso),
      source: p.source,
      routineName: p.routineName,
      plan: p.plan,
      sessionId: p.sessionId,
    });
    if (res.ok) {
      await removePendingSession(p.sessionId);
      guardadas++;
      if (toLocalDateString(new Date(p.endedAtIso)) === getLocalToday()) {
        try {
          const { awardBooleanElectron } = await import('@/src/services/electron-service');
          await awardBooleanElectron(userId, 'strength');
        } catch { /* fail-soft: la sesión vale aunque el award falle */ }
      }
    }
  }
  return guardadas;
}

/** Última sesión pesada reciente (para el sesgo del generador). */
export async function ayerFueSesionPesada(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('date, plan')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return false;
  const ultima = data[0] as { date: string; plan: { bloques?: { slot?: string }[] } | null };
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (ultima.date !== toLocalDateString(ayer)) return false;
  return (ultima.plan?.bloques ?? []).some((b) => b.slot === 'multi_pesado');
}

/** Slugs primarios de las últimas sesiones (anti-repetición del generador). */
export async function getSlugsRecientes(userId: string, dias = 2): Promise<string[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = toLocalDateString(desde);
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('matrix_slug')
    .eq('user_id', userId)
    .not('matrix_slug', 'is', null)
    .gte('date', desdeStr)
    .limit(200);
  if (error) return [];
  return [...new Set(((data ?? []) as { matrix_slug: string }[]).map((r) => r.matrix_slug))];
}

export { epley1RM };
