/**
 * ARGOS Voice — preferencia de voz (masculina/femenina) elegida en Meet ARGOS.
 *
 * Persistencia en profiles.argos_voice (migración 205). El PREVIEW usa expo-speech
 * (TTS del dispositivo) vía import perezoso — es un stub honesto mientras no
 * aterrice la voz real de ARGOS (ElevenLabs vía edge function, MB-4 J5). Sin el
 * módulo nativo, el preview degrada a no-op y jamás crashea por OTA.
 */
import { supabase } from '@/src/lib/supabase';

export type ArgosVoice = 'masculina' | 'femenina';

/** Frase de muestra (neutra — NO es el copy #141 de Meet ARGOS). */
const PREVIEW_LINE = 'Hola, soy ARGOS. Vamos a construir tu mejor versión.';

export async function saveArgosVoice(userId: string, voice: ArgosVoice): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ argos_voice: voice }).eq('id', userId);
  return !error;
}

export async function getArgosVoice(userId: string): Promise<ArgosVoice | null> {
  const { data } = await supabase.from('profiles').select('argos_voice').eq('id', userId).maybeSingle();
  const v = (data as any)?.argos_voice;
  return v === 'masculina' || v === 'femenina' ? v : null;
}

/**
 * Reproduce una muestra de la voz elegida con TTS del dispositivo.
 * Stub honesto: la voz definitiva de ARGOS llega en MB-4 J5. Fail-soft total.
 */
export async function previewArgosVoice(voice: ArgosVoice): Promise<void> {
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
    // pitch más grave para masculina, más agudo para femenina — diferenciación
    // audible con las voces del SO mientras no exista la voz propia.
    Speech.speak(PREVIEW_LINE, {
      language: 'es-MX',
      pitch: voice === 'masculina' ? 0.85 : 1.15,
      rate: 1.0,
    });
  } catch {
    // sin expo-speech (binario viejo) → sin preview, nunca crashea.
  }
}

export async function stopArgosVoicePreview(): Promise<void> {
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
  } catch { /* no-op */ }
}
