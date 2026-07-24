/**
 * N-Back — I/O sobre las tablas de la mig 197 (+218) y la economía.
 *
 * - nback_sessions: una fila por ROUND completado (date local del cliente).
 * - nback_user_state: N actual/best, racha, totales — actualizado aquí.
 * - e-: 'nback' once/día vía awardBooleanElectron (marca la card de HOY con el
 *   1er round; regla #5/#6: emitir electrons_changed + day_changed).
 * - H+ (decisión #44-5): claim_nback_protons(p_date) — RPC server-derivada e
 *   idempotente (mig 218); el cliente solo muestra lo otorgado.
 */
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { getLocalToday } from '@/src/utils/date-helpers';
import { awardBooleanElectron } from '@/src/services/electron-service';
import {
  NBACK_CONFIG, nextStreak, type NBackResumeMode, type ChannelScore, type NBackRoundResult,
} from './nback-core';

// ── Settings del módulo (device-local; decisión #44-1 resume_mode) ──────────

export interface NBackSettings {
  speed: number;                 // 1 | 1.5 | 2
  feedbackSound: boolean;        // chime/haptic de feedback (las LETRAS nunca se apagan — #44-3)
  resumeMode: NBackResumeMode;   // 'last' (default) | 'best' | 'restart'
}

export const DEFAULT_NBACK_SETTINGS: NBackSettings = {
  speed: 1,
  feedbackSound: true,
  resumeMode: 'last',
};

const SETTINGS_KEY = '@atp/nback_settings';

export async function getNBackSettings(): Promise<NBackSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_NBACK_SETTINGS;
    return {
      speed: (NBACK_CONFIG.SPEEDS as readonly number[]).includes(parsed.speed) ? parsed.speed : 1,
      feedbackSound: parsed.feedbackSound !== false,
      resumeMode: ['last', 'best', 'restart'].includes(parsed.resumeMode) ? parsed.resumeMode : 'last',
    };
  } catch {
    return DEFAULT_NBACK_SETTINGS;
  }
}

export async function saveNBackSettings(settings: NBackSettings): Promise<void> {
  try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* fail-soft */ }
}

// ── Estado del usuario ──────────────────────────────────────────────────────

export interface NBackUserState {
  current_n: number;
  best_n: number;
  sessions_total: number;
  streak_days: number;
  last_session_date: string | null;
  time_practiced_total_min: number;
  challenge_started_on: string | null;
}

const STATE_DEFAULT: NBackUserState = {
  current_n: NBACK_CONFIG.N_START,
  best_n: NBACK_CONFIG.N_START,
  sessions_total: 0,
  streak_days: 0,
  last_session_date: null,
  time_practiced_total_min: 0,
  challenge_started_on: null,
};

/** Estado del user; si no hay fila aún devuelve defaults (la fila se crea al
 * completar el 1er round — no ensuciar la tabla con lurkers). */
export async function fetchNBackState(userId: string): Promise<NBackUserState> {
  const { data } = await supabase
    .from('nback_user_state')
    .select('current_n, best_n, sessions_total, streak_days, last_session_date, time_practiced_total_min, challenge_started_on')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return STATE_DEFAULT;
  return { ...STATE_DEFAULT, ...data } as NBackUserState;
}

export async function countRoundsOnDate(userId: string, date: string): Promise<number> {
  const { count } = await supabase
    .from('nback_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('date', date).not('completed_at', 'is', null);
  return count ?? 0;
}

/** Rounds por día para el week-strip (yyyy-mm-dd → count). */
export async function fetchRoundsByDate(userId: string, fromDate: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('nback_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .not('completed_at', 'is', null);
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { date: string | null }[]) {
    if (row.date) map[row.date] = (map[row.date] ?? 0) + 1;
  }
  return map;
}

// ── Completar un round ──────────────────────────────────────────────────────

export interface ProtonAward { kind: 'daily' | 'pr' | 'streak7' | 'streak30'; amount: number; n?: number }

export interface RoundOutcome {
  electronAwarded: boolean;   // 1er round del día → e- 'nback' (card HOY)
  roundsToday: number;
  protons: ProtonAward[];
}

export interface CompleteRoundParams {
  startedAt: Date;
  visual: ChannelScore;
  audio: ChannelScore;
  result: NBackRoundResult;
  nLevel: number;
  stimuliCount: number;
  speed: number;
  durationMin: number;
}

/**
 * Persiste el round + actualiza estado + economía. Fail-soft por capas: si la
 * red muere después del insert, el estado se reconcilia en el próximo round
 * (streak/best derivan de state previo + hoy).
 */
export async function completeNBackRound(userId: string, p: CompleteRoundParams): Promise<RoundOutcome> {
  const today = getLocalToday();

  const { error: insertError } = await supabase.from('nback_sessions').insert({
    user_id: userId,
    started_at: p.startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    date: today,
    n_level: p.nLevel,
    stimuli_count: p.stimuliCount,
    matches_visual_total: p.visual.total,
    matches_visual_hit: p.visual.hits,
    matches_visual_miss: p.visual.misses,
    matches_visual_false: p.visual.falses,
    matches_audio_total: p.audio.total,
    matches_audio_hit: p.audio.hits,
    matches_audio_miss: p.audio.misses,
    matches_audio_false: p.audio.falses,
    accuracy_visual: Math.round(p.result.accuracyVisual * 1000) / 1000,
    accuracy_audio: Math.round(p.result.accuracyAudio * 1000) / 1000,
    promoted: p.result.promoted,
    demoted: p.result.demoted,
    next_n: p.result.nextN,
    metadata: { speed: p.speed },
  });
  if (insertError) throw new Error(insertError.message);

  // Estado: racha/best/totales derivados del estado previo (lógica pura).
  const prev = await fetchNBackState(userId);
  const isNewBest = p.result.nextN > prev.best_n;
  const nextState = {
    user_id: userId,
    current_n: p.result.nextN,
    best_n: Math.max(prev.best_n, p.result.nextN),
    ...(isNewBest ? { best_n_achieved_at: new Date().toISOString() } : {}),
    sessions_total: prev.sessions_total + 1,
    streak_days: nextStreak(prev.last_session_date, today, prev.streak_days),
    last_session_date: today,
    time_practiced_total_min: prev.time_practiced_total_min + Math.max(1, Math.round(p.durationMin)),
    challenge_started_on: prev.challenge_started_on ?? today,
    updated_at: new Date().toISOString(),
  };
  const { error: stateError } = await supabase
    .from('nback_user_state')
    .upsert(nextState, { onConflict: 'user_id' });
  if (stateError) {
    // Round guardado, estado no — el próximo round lo repara. No romper el flujo.
  }

  // e-: el 1er round del día marca la card de HOY (key determinística, once/día).
  const roundsToday = await countRoundsOnDate(userId, today);
  let electronAwarded = false;
  if (roundsToday === 1) {
    electronAwarded = await awardBooleanElectron(userId, 'nback').catch(() => false);
  }
  DeviceEventEmitter.emit('electrons_changed');
  DeviceEventEmitter.emit('day_changed');

  // H+ (decisión #44-5): la RPC deriva y dedupe server-side.
  let protons: ProtonAward[] = [];
  try {
    const { data } = await supabase.rpc('claim_nback_protons', { p_date: today });
    if (data?.success && Array.isArray(data.awarded)) protons = data.awarded as ProtonAward[];
  } catch { /* cosmético: los H+ entran igual en el próximo claim */ }

  return { electronAwarded, roundsToday, protons };
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface NBackChallengePoint { date: string; avgN: number; rounds: number }

export interface NBackChallengeStats {
  points: NBackChallengePoint[];
  activeDays: number;
  avgLevel: number;
  avgVisualPct: number;
  avgAudioPct: number;
}

export async function fetchChallengeStats(userId: string, sinceDate: string): Promise<NBackChallengeStats> {
  const { data } = await supabase
    .from('nback_sessions')
    .select('date, n_level, accuracy_visual, accuracy_audio')
    .eq('user_id', userId)
    .gte('date', sinceDate)
    .not('completed_at', 'is', null)
    .order('date', { ascending: true });
  const rows = (data ?? []) as { date: string | null; n_level: number; accuracy_visual: number | null; accuracy_audio: number | null }[];

  const byDate = new Map<string, { sumN: number; count: number }>();
  let sumN = 0, sumV = 0, sumA = 0, nV = 0, nA = 0;
  for (const r of rows) {
    if (!r.date) continue;
    const e = byDate.get(r.date) ?? { sumN: 0, count: 0 };
    e.sumN += r.n_level; e.count += 1;
    byDate.set(r.date, e);
    sumN += r.n_level;
    if (r.accuracy_visual != null) { sumV += Number(r.accuracy_visual); nV++; }
    if (r.accuracy_audio != null) { sumA += Number(r.accuracy_audio); nA++; }
  }
  const points = [...byDate.entries()]
    .map(([date, e]) => ({ date, avgN: e.sumN / e.count, rounds: e.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    points,
    activeDays: byDate.size,
    avgLevel: rows.length ? sumN / rows.length : 0,
    avgVisualPct: nV ? Math.round((sumV / nV) * 100) : 0,
    avgAudioPct: nA ? Math.round((sumA / nA) * 100) : 0,
  };
}

export interface NBackPercentiles { users: number; sessionsPct: number; streakPct: number; bestNPct: number }

/** Percentiles vs todos (RPC agregada — cero filas cross-user). */
export async function fetchNBackPercentiles(): Promise<NBackPercentiles | null> {
  try {
    const { data, error } = await supabase.rpc('nback_percentiles');
    if (error || !data?.success) return null;
    return {
      users: data.users ?? 0,
      sessionsPct: data.sessions_pct ?? 0,
      streakPct: data.streak_pct ?? 0,
      bestNPct: data.best_n_pct ?? 0,
    };
  } catch {
    return null;
  }
}
