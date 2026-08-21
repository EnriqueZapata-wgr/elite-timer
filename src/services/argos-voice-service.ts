/**
 * ARGOS Voice — preferencia de voz (masculina/femenina) elegida en Meet ARGOS.
 *
 * Persistencia en profiles.argos_voice (migración 205). El PREVIEW usa la voz
 * REAL de ARGOS (ElevenLabs vía edge function argos-voice, MB-4 J5) y NADA MÁS:
 * si esa voz no está disponible, el botón "Muestra" lo dice en vez de fingir
 * con el TTS del sistema. Ver la nota de previewArgosVoice.
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
 * Reproduce una muestra de la voz elegida. Devuelve true solo si sonó la voz
 * REAL de ARGOS.
 *
 * 21-ago-2026 — SE QUITÓ EL FALLBACK A expo-speech. Cuando la voz propia no
 * estaba disponible, esto hablaba con el TTS del sistema cambiándole el tono:
 * 0.85 para "masculina" y 1.15 para "femenina". En un teléfono cuya voz de
 * español es femenina, las dos opciones sonaban a la MISMA mujer, una un poco
 * más grave. El dueño lo cachó en el primer minuto de la app y tenía razón:
 * ofrecer una elección que no se cumple se siente barato, y es lo primero que
 * la persona toca. Además contradecía la doctrina que este mismo pipeline ya
 * tenía escrita en argos-tts: nunca voz robótica del sistema, mejor callar.
 *
 * Ahora: o suena ARGOS de verdad, o el botón lo dice y no inventa nada.
 */
export async function previewArgosVoice(voice: ArgosVoice): Promise<boolean> {
  await stopPlayback();
  const clip = await synthesizeSpeech(PREVIEW_LINE, voice);
  if (!clip) return false;
  return await playAudioFile(clip.uri);
}

export async function stopArgosVoicePreview(): Promise<void> {
  await stopPlayback();
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
  } catch { /* no-op */ }
}
