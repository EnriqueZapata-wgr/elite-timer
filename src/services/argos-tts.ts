/**
 * ARGOS TTS — síntesis de voz (ElevenLabs vía edge function) + playback (MB-4 J5).
 *
 * El primitivo reusable del pipeline de voz: `synthesizeSpeech` pide el audio a
 * la edge function `argos-voice` (voice IDs + API key SOLO ahí, nunca en cliente)
 * y `playAudioFile` lo reproduce con expo-audio. Todo con import perezoso —
 * sin módulo nativo degrada a no-op, nunca crashea por OTA.
 *
 * Fail-soft: si la voz no está disponible (sin key/config o error), devuelve null
 * → el caller degrada a texto (doctrina: nunca voz robótica del sistema).
 */
import Constants from 'expo-constants';
import type { ArgosVoice } from '@/src/services/argos-voice-service';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const VOICE_URL = `${SUPABASE_URL}/functions/v1/argos-voice`;

export interface SynthesizedClip {
  /** file:// URI del mp3 en cache, listo para expo-audio. */
  uri: string;
}

/**
 * Sintetiza `text` con la voz elegida. Devuelve el URI local del mp3, o null si
 * la voz no está disponible (el caller cae a texto).
 */
export async function synthesizeSpeech(text: string, voice: ArgosVoice): Promise<SynthesizedClip | null> {
  const clean = (text ?? '').trim();
  if (!clean) return null;
  try {
    const resp = await fetch(VOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'tts', text: clean, voice }),
    });
    if (!resp.ok) return null; // 503/502 → fallback a texto
    const data = await resp.json();
    if (!data?.audio_base64) return null;

    // Escribir el mp3 a cache para reproducirlo con expo-audio.
    const FileSystem = await import('expo-file-system');
    const dir = (FileSystem as any).cacheDirectory ?? '';
    const uri = `${dir}argos-tts-${clipId(clean)}.mp3`;
    await (FileSystem as any).writeAsStringAsync(uri, data.audio_base64, {
      encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
    });
    return { uri };
  } catch {
    return null; // red/módulo ausente → texto
  }
}

/** ID estable-ish del clip por su texto (sin Date.now/random — determinístico). */
function clipId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = (h * 31 + text.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(36);
}

/** Transcribe audio (base64) a texto vía Gemini (edge function). null si falla. */
export async function transcribeAudio(audioBase64: string, mime = 'audio/mp4'): Promise<string | null> {
  if (!audioBase64) return null;
  try {
    const resp = await fetch(VOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'stt', audio_base64: audioBase64, mime }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = String(data?.text ?? '').trim();
    return text || null;
  } catch {
    return null;
  }
}

// ─── Playback (una pista a la vez; interrumpible) ───

type ExpoAudio = typeof import('expo-audio');
let audioMod: ExpoAudio | null = null;
async function getAudioMod(): Promise<ExpoAudio | null> {
  if (audioMod) return audioMod;
  try { audioMod = await import('expo-audio'); return audioMod; } catch { return null; }
}

let currentPlayer: import('expo-audio').AudioPlayer | null = null;

/** Reproduce un clip. Detiene el anterior. false si el audio no está disponible. */
export async function playAudioFile(uri: string, volume = 1): Promise<boolean> {
  const audio = await getAudioMod();
  if (!audio) return false;
  try {
    await audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    await stopPlayback();
    const player = audio.createAudioPlayer({ uri });
    player.volume = Math.max(0, Math.min(1, volume));
    player.play();
    currentPlayer = player;
    return true;
  } catch {
    return false;
  }
}

/** Corta la reproducción actual (barge-in / interrupción). */
export async function stopPlayback(): Promise<void> {
  if (!currentPlayer) return;
  const p = currentPlayer;
  currentPlayer = null;
  try { p.pause(); } catch { /* */ }
  try { p.remove(); } catch { /* */ }
}
