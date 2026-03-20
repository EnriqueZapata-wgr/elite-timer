/**
 * Speech helper — TTS multiplataforma.
 *
 * Web: window.speechSynthesis (Web Speech API)
 * Mobile (iOS/Android): expo-speech (import estático)
 *
 * El idioma se pasa como parámetro — NO está hardcodeado.
 */
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/** Habla el texto en el idioma especificado (default: es-MX).
 *  Siempre cancela cualquier speech en curso antes de iniciar uno nuevo. */
export function speak(text: string, language: string = 'es-MX'): void {
  stopSpeech();
  if (Platform.OS === 'web') {
    speakWeb(text, language);
  } else {
    speakNative(text, language);
  }
}

/** Detiene cualquier speech en curso */
export function stopSpeech(): void {
  if (Platform.OS === 'web') {
    try {
      window.speechSynthesis?.cancel();
    } catch { /* no disponible */ }
  } else {
    try {
      Speech.stop();
    } catch { /* no disponible */ }
  }
}

// === IMPLEMENTACIONES POR PLATAFORMA ===

function speakWeb(text: string, language: string): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  } catch { /* Web Speech API no disponible */ }
}

function speakNative(text: string, language: string): void {
  try {
    Speech.speak(text, { language, rate: 1.1 });
  } catch { /* expo-speech no disponible */ }
}
