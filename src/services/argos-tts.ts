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
import { supabase } from '@/src/lib/supabase';
import { generateUUID } from '@/src/utils/uuid';
import type { ArgosVoice } from '@/src/services/argos-voice-service';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const VOICE_URL = `${SUPABASE_URL}/functions/v1/argos-voice`;

/** Fix B1: argos-voice valida el user con getUser() — hay que mandar el JWT del
 *  user (access token de la sesión), no la anon key. Sin sesión → null (fail-soft
 *  a texto / TTS del SO, nunca crashea). */
async function getUserJwt(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

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
    const FileSystem = await import('expo-file-system');
    const dir = (FileSystem as any).cacheDirectory ?? '';
    // Cache por texto+voz (la voz VA en la key: el mismo texto en masculina y
    // femenina son clips distintos).
    const uri = `${dir}argos-tts-${voice}-${clipId(clean)}.mp3`;

    // Cache de LECTURA (auditoría MB-4): si el clip ya existe, no re-pagamos
    // ElevenLabs (el preview de Meet ARGOS repetía la síntesis en cada tap).
    try {
      const info = await (FileSystem as any).getInfoAsync?.(uri);
      if (info?.exists) return { uri };
    } catch { /* cache miss → sintetizar */ }

    const jwt = await getUserJwt();
    if (!jwt) return null; // sin sesión no hay voz (la función exige user real)
    const resp = await fetch(VOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      // idempotency_key: el server cobra voice_tts una sola vez aunque haya retry.
      body: JSON.stringify({ action: 'tts', text: clean, voice, idempotency_key: generateUUID() }),
    });
    if (!resp.ok) return null; // 401/402/429/503/502 → fallback a texto
    const data = await resp.json();
    if (!data?.audio_base64) return null;

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
    const jwt = await getUserJwt();
    if (!jwt) return null;
    const resp = await fetch(VOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ action: 'stt', audio_base64: audioBase64, mime, idempotency_key: generateUUID() }),
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
// Fix B4: resolver pendiente de playAudioFileToEnd — stopPlayback lo despierta
// para que un barge-in no deje la cola de voz colgada esperando didJustFinish.
let releaseCurrentWait: (() => void) | null = null;

// Backstop por si didJustFinish nunca llega (clip corrupto / simulador): los
// chunks son frases sueltas, ningún clip legítimo dura esto.
const MAX_CLIP_WAIT_MS = 45000;

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

/**
 * Fix B4: reproduce un clip y resuelve cuando TERMINÓ de sonar (didJustFinish
 * de expo-audio), no antes. Es el primitivo de la cola secuencial del modo voz —
 * antes cada chunk mataba al anterior a media frase. Un stopPlayback() en vuelo
 * (barge-in) resuelve de inmediato.
 */
export async function playAudioFileToEnd(uri: string, volume = 1): Promise<boolean> {
  const audio = await getAudioMod();
  if (!audio) return false;
  try {
    await audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    await stopPlayback();
    const player = audio.createAudioPlayer({ uri });
    player.volume = Math.max(0, Math.min(1, volume));
    currentPlayer = player;
    await new Promise<void>((resolve) => {
      let sub: { remove?: () => void } | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { sub?.remove?.(); } catch { /* */ }
        if (timer) clearTimeout(timer);
        resolve();
      };
      releaseCurrentWait = finish;
      try {
        sub = (player as any).addListener?.('playbackStatusUpdate', (s: any) => {
          if (s?.didJustFinish) finish();
        }) ?? null;
      } catch { /* sin listener → cae al backstop */ }
      timer = setTimeout(finish, MAX_CLIP_WAIT_MS);
      player.play();
    });
    // Si nadie lo detuvo (terminó solo), liberar aquí.
    if (currentPlayer === player) {
      currentPlayer = null;
      releaseCurrentWait = null;
      try { player.remove(); } catch { /* */ }
    }
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
  const release = releaseCurrentWait;
  releaseCurrentWait = null;
  try { p.pause(); } catch { /* */ }
  try { p.remove(); } catch { /* */ }
  release?.(); // B4: despierta al waiter de playAudioFileToEnd
}
