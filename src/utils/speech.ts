/**
 * Speech helper — TTS multiplataforma.
 *
 * Web: window.speechSynthesis (Web Speech API)
 * Mobile (iOS/Android): expo-speech (import estático)
 *
 * Detecta plataforma automáticamente. Si ninguna funciona, falla silenciosamente.
 */
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/** Habla el texto en español mexicano */
export function speak(text: string): void {
  if (Platform.OS === 'web') {
    speakWeb(text);
  } else {
    speakNative(text);
  }
}

/** Detiene cualquier speech en curso */
export function stopSpeech(): void {
  if (Platform.OS === 'web') {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // No disponible
    }
  } else {
    try {
      Speech.stop();
    } catch {
      // No disponible
    }
  }
}

// === IMPLEMENTACIONES POR PLATAFORMA ===

/** Web Speech API */
function speakWeb(text: string): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Web Speech API no disponible
  }
}

/** expo-speech para iOS/Android */
function speakNative(text: string): void {
  try {
    Speech.speak(text, { language: 'es-MX', rate: 1.1 });
  } catch {
    // expo-speech no disponible
  }
}
