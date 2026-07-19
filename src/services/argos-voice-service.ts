/**
 * ARGOS Voice — preferencia de voz (masculina/femenina) elegida en Meet ARGOS.
 *
 * Persistencia en profiles.argos_voice (migración 205). El PREVIEW usa la voz
 * REAL de ARGOS (ElevenLabs vía edge function argos-voice, MB-4 J5) con fallback
 * a expo-speech (TTS del SO) si la voz propia no está disponible (sin keys/config
 * o binario viejo) — nunca se queda mudo el botón "Muestra".
 */
import { supabase } from '@/src/lib/supabase';
import { synthesizeSpeech, playAudioFile, stopPlayback } from '@/src/services/argos-tts';

export type ArgosVoice = 'masculina' | 'femenina';

/** Default cuando el user no ha elegido: masculina (ARGOS es nombre masculino).
 *  NUNCA se infiere del biological_sex — el sexo del user no decide qué voz oye. */
export const DEFAULT_ARGOS_VOICE: ArgosVoice = 'masculina';

/** Frase de muestra (neutra — NO es el copy #141 de Meet ARGOS). */
const PREVIEW_LINE = 'Hola, soy ARGOS. Vamos a construir tu mejor versión.';

export async function saveArgosVoice(userId: string, voice: ArgosVoice): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ argos_voice: voice }).eq('id', userId);
  return !error;
}

export async function getArgosVoice(userId: string): Promise<ArgosVoice | null> {
  const { data } = await supabase.from('profiles').select('argos_voice').eq('id', userId).maybeSingle();
  return normalizeVoice((data as any)?.argos_voice);
}

/** Resuelve la voz efectiva: la elegida, o el default (nunca por biological_sex). */
export function resolveArgosVoice(stored: string | null | undefined): ArgosVoice {
  return normalizeVoice(stored) ?? DEFAULT_ARGOS_VOICE;
}

function normalizeVoice(v: unknown): ArgosVoice | null {
  return v === 'masculina' || v === 'femenina' ? v : null;
}

/**
 * Reproduce una muestra de la voz elegida. Intenta la voz REAL (ElevenLabs) y,
 * si no está disponible, cae a expo-speech (TTS del SO). Fail-soft total.
 */
export async function previewArgosVoice(voice: ArgosVoice): Promise<void> {
  await stopPlayback();
  // 1) Voz real de ARGOS (ElevenLabs vía edge function).
  const clip = await synthesizeSpeech(PREVIEW_LINE, voice);
  if (clip && await playAudioFile(clip.uri)) return;

  // 2) Fallback: TTS del SO (sin keys/config o binario viejo).
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
    Speech.speak(PREVIEW_LINE, {
      language: 'es-MX',
      pitch: voice === 'masculina' ? 0.85 : 1.15,
      rate: 1.0,
    });
  } catch { /* sin TTS → sin preview, nunca crashea */ }
}

export async function stopArgosVoicePreview(): Promise<void> {
  await stopPlayback();
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
  } catch { /* no-op */ }
}
