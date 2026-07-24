/**
 * Sprint Audio Mente — servicio del catálogo de audio + entrega gateada.
 *
 * - Catálogo: audio_pieces (migración 212, RLS: solo publicadas). La app pinta
 *   dinámico — cero piezas hardcodeadas.
 * - Entrega: edge function mente-audio-url (fetch directo, NUNCA
 *   supabase.functions.invoke — patrón argos-tts). El bucket es privado; la
 *   function valida tier Pro server-side y devuelve signed URL TTL 1h.
 *   403 → la UI muestra upsell (paywall).
 * - Progreso por pieza en AsyncStorage (retomar donde quedó).
 * - Registro de sesión: mind_sessions (type según categoría, respeta el CHECK
 *   de la migración 049) + electrón + eventos.
 */
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import { awardPracticeElectron, type PracticeAwardStatus } from '@/src/services/electron-service';
import { qualifiesForPracticeElectron } from '@/src/services/practice-electron-core';
import { getLocalToday } from '@/src/utils/date-helpers';

import {
  shouldClearPosition, sessionTypeFor, electronSourceFor,
  parseProgressEntry, serializeProgressEntry, type StoredAudioProgress,
} from './mente-audio-core';
import type { AudioPiece, AudioCategoria } from './mente-audio-service-types';

export type { AudioPiece, AudioCategoria };

const SUPABASE_URL: string =
  (Constants.expoConfig?.extra as any)?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const AUDIO_URL_FN = `${SUPABASE_URL}/functions/v1/mente-audio-url`;

/** Catálogo publicado, ordenado (RLS filtra publicado=true igualmente). */
export async function fetchAudioPieces(): Promise<AudioPiece[]> {
  const { data, error } = await supabase
    .from('audio_pieces')
    .select('id, slug, titulo, subtitulo, categoria, duracion_seg, voz, imagen_path, orden, tier, hard_gate')
    .eq('publicado', true)
    .order('orden', { ascending: true });
  if (!error && data) return data as AudioPiece[];
  // Fallback pre-migración 217: si hard_gate aún no existe en la DB (OTA antes
  // del db push), el select explícito daría 400 — degradar sin la columna para
  // no dejar el catálogo vacío. hard_gate=false es el default seguro visible
  // (la pieza gateada aún no existe en ese escenario).
  const retry = await supabase
    .from('audio_pieces')
    .select('id, slug, titulo, subtitulo, categoria, duracion_seg, voz, imagen_path, orden, tier')
    .eq('publicado', true)
    .order('orden', { ascending: true });
  if (retry.error || !retry.data) return [];
  return (retry.data as Omit<AudioPiece, 'hard_gate'>[]).map(p => ({ ...p, hard_gate: false }));
}

export type AudioUrlResult =
  | { status: 'ok'; url: string }
  | { status: 'pro_required' }
  | { status: 'error'; message?: string };

/** Signed URL del audio vía edge function (gate de tier server-side). */
export async function getAudioUrl(slug: string): Promise<AudioUrlResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) return { status: 'error', message: 'no_session' };
    const resp = await fetch(AUDIO_URL_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ slug }),
    });
    if (resp.status === 403) return { status: 'pro_required' };
    if (!resp.ok) return { status: 'error', message: `http_${resp.status}` };
    const json = await resp.json().catch(() => null);
    if (!json?.url) return { status: 'error', message: 'no_url' };
    return { status: 'ok', url: json.url };
  } catch (e: any) {
    return { status: 'error', message: String(e?.message ?? e) };
  }
}

// ── Favoritas (Ajuste v2 · 4) ───────────────────────────────────────────────

/** Slugs favoritos del usuario (RLS: solo los suyos). Fail-soft → set vacío. */
export async function fetchFavoriteSlugs(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('audio_favorites')
    .select('slug')
    .eq('user_id', userId);
  if (error || !data) return new Set();
  return new Set(data.map((r: { slug: string }) => r.slug));
}

/**
 * Marca/desmarca favorita. Devuelve true si la operación quedó en la DB
 * (la UI hace update optimista y revierte si esto regresa false).
 */
export async function setFavorite(userId: string, slug: string, fav: boolean): Promise<boolean> {
  try {
    if (fav) {
      const { error } = await supabase
        .from('audio_favorites')
        .upsert({ user_id: userId, slug }, { onConflict: 'user_id,slug', ignoreDuplicates: true });
      return !error;
    }
    const { error } = await supabase
      .from('audio_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('slug', slug);
    return !error;
  } catch {
    return false;
  }
}

// ── Progreso por pieza (retomar donde quedó) ────────────────────────────────

const PROGRESS_KEY = '@atp/mente_audio_progress';

// slug → número (formato viejo: posición) | { p, l } (posición + escucha efectiva)
type ProgressMap = Record<string, unknown>;

async function readProgressMap(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Progreso guardado: posición para retomar + segundos EFECTIVOS ya escuchados
 * (delta economía: la acumulación hacia el 80% sobrevive salir del player).
 */
export async function getSavedProgress(slug: string): Promise<StoredAudioProgress> {
  const map = await readProgressMap();
  return parseProgressEntry(map[slug]) ?? { position: 0, listened: 0 };
}

/**
 * Guarda posición + escucha efectiva. Cerca del final (<30s restantes) o al
 * inicio (<10s) se limpia: la próxima escucha empieza de cero.
 */
export async function savePosition(
  slug: string,
  positionSeg: number,
  duracionSeg: number,
  listenedSeg = 0,
): Promise<void> {
  try {
    const map = await readProgressMap();
    if (shouldClearPosition(positionSeg, duracionSeg)) delete map[slug];
    else map[slug] = serializeProgressEntry(positionSeg, listenedSeg);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch { /* fail-soft */ }
}

export async function clearPosition(slug: string): Promise<void> {
  try {
    const map = await readProgressMap();
    delete map[slug];
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch { /* fail-soft */ }
}

// ── Registro de sesión completada ───────────────────────────────────────────

export type AudioElectronOutcome = PracticeAwardStatus | 'not_eligible' | 'session_error';

/**
 * Loguea la sesión en mind_sessions + electrón. Llamar al COMPLETAR la pieza
 * (didJustFinish) — no en pausas. type respeta el CHECK de la migración 049:
 * respiracion → 'breathing'; meditacion/descanso → 'meditation'.
 *
 * Delta economía 2026-07-23: `effectiveSeconds` son los segundos REALMENTE
 * reproducidos (los seeks no cuentan). El e- solo se otorga si cubren ≥80%
 * de la pieza; la sesión se registra igual. Cero Economía/H+ aquí — las
 * prácticas dan solo e- (cap 3/día + 3h server-side, trigger 213).
 */
export async function logAudioSession(
  userId: string,
  piece: AudioPiece,
  effectiveSeconds: number,
): Promise<AudioElectronOutcome> {
  // Binaurales (219): audio-utilidad, no sesión — jamás mind_sessions ni e-.
  // El player ya no llama aquí para binaural; esta guardia blinda call-sites futuros.
  if (piece.categoria === 'binaural') return 'not_eligible';
  const type = sessionTypeFor(piece.categoria);
  try {
    const { error } = await supabase.from('mind_sessions').insert({
      user_id: userId,
      type,
      template_id: `audio_${piece.slug}`,
      template_name: piece.titulo,
      duration_seconds: Math.round(effectiveSeconds),
      date: getLocalToday(),
    });
    if (error) return 'session_error';
    let outcome: AudioElectronOutcome = 'not_eligible';
    if (qualifiesForPracticeElectron(effectiveSeconds, piece.duracion_seg)) {
      // Espejo de meditation.tsx / breathing.tsx: fuente de electrón por tipo.
      const source = electronSourceFor(type);
      outcome = await awardPracticeElectron(userId, source).catch(() => 'error' as const);
    }
    DeviceEventEmitter.emit('electrons_changed');
    DeviceEventEmitter.emit('day_changed');
    return outcome;
  } catch {
    return 'session_error';
  }
}
