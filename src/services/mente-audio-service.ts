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
import { awardBooleanElectron } from '@/src/services/electron-service';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { getLocalToday } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/utils/uuid';

import { shouldClearPosition, sessionTypeFor, electronSourceFor } from './mente-audio-core';
import type { AudioPiece, AudioCategoria } from './mente-audio-service-types';

export type { AudioPiece, AudioCategoria };

const SUPABASE_URL: string =
  (Constants.expoConfig?.extra as any)?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const AUDIO_URL_FN = `${SUPABASE_URL}/functions/v1/mente-audio-url`;

/** Catálogo publicado, ordenado (RLS filtra publicado=true igualmente). */
export async function fetchAudioPieces(): Promise<AudioPiece[]> {
  const { data, error } = await supabase
    .from('audio_pieces')
    .select('id, slug, titulo, subtitulo, categoria, duracion_seg, voz, imagen_path, orden, tier')
    .eq('publicado', true)
    .order('orden', { ascending: true });
  if (error || !data) return [];
  return data as AudioPiece[];
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

// ── Progreso por pieza (retomar donde quedó) ────────────────────────────────

const PROGRESS_KEY = '@atp/mente_audio_progress';

type ProgressMap = Record<string, number>; // slug → segundos

async function readProgressMap(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Posición guardada (segundos) o 0. */
export async function getSavedPosition(slug: string): Promise<number> {
  const map = await readProgressMap();
  const v = map[slug];
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
}

/**
 * Guarda posición. Cerca del final (<30s restantes) o al inicio (<10s) se
 * limpia: la próxima escucha empieza de cero.
 */
export async function savePosition(slug: string, positionSeg: number, duracionSeg: number): Promise<void> {
  try {
    const map = await readProgressMap();
    if (shouldClearPosition(positionSeg, duracionSeg)) delete map[slug];
    else map[slug] = Math.floor(positionSeg);
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

/**
 * Loguea la sesión en mind_sessions + electrón. Llamar al COMPLETAR la pieza
 * (didJustFinish) — no en pausas. type respeta el CHECK de la migración 049:
 * respiracion → 'breathing'; meditacion/descanso → 'meditation'.
 */
export async function logAudioSession(userId: string, piece: AudioPiece, secondsListened: number): Promise<void> {
  const type = sessionTypeFor(piece.categoria);
  try {
    const { error } = await supabase.from('mind_sessions').insert({
      user_id: userId,
      type,
      template_id: `audio_${piece.slug}`,
      template_name: piece.titulo,
      duration_seconds: Math.round(secondsListened),
      date: getLocalToday(),
    });
    if (error) return;
    // Espejo de meditation.tsx / breathing.tsx: fuente de electrón por tipo.
    const source = electronSourceFor(type);
    await awardBooleanElectron(userId, source).catch(() => {});
    DeviceEventEmitter.emit('electrons_changed');
    DeviceEventEmitter.emit('day_changed');
    if (source === 'meditation') {
      // Economía (fire-and-forget, cap diario) — mismo habit_type que el timer.
      fireElectronAward({
        habit_type: 'meditation_in_app',
        evidence_tier: 'evidence',
        local_date: getLocalToday(),
        idempotency_key: `meditation_in_app_${userId}_${getLocalToday()}_audio_${piece.slug}_${generateUUID().slice(0, 8)}`,
        metadata: { source: 'mente_audio', slug: piece.slug, duration_seconds: Math.round(secondsListened) },
      });
    }
  } catch { /* fail-soft */ }
}
