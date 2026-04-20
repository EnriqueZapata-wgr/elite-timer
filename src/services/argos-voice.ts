/**
 * ARGOS Voice — TTS para respuestas de ARGOS.
 * Limpia markdown antes de hablar y controla el estado de speech.
 */
import * as Speech from 'expo-speech';

let isSpeaking = false;

/** Limpia markdown/formato del texto antes de TTS */
function cleanForSpeech(text: string): string {
  return text
    .replace(/#{1,3}\s/g, '')       // Quitar ##, ###
    .replace(/\*\*/g, '')           // Quitar **bold**
    .replace(/\*/g, '')             // Quitar *italic*
    .replace(/`[^`]*`/g, '')        // Quitar `code`
    .replace(/- /g, '')             // Quitar bullets
    .replace(/\[DEBUG\].*/g, '')    // Quitar debug
    .replace(/\n{2,}/g, '. ')      // Doble salto → pausa
    .replace(/\n/g, '. ')          // Salto → pausa
    .trim();
}

/** ARGOS habla el texto. Detiene cualquier speech previo. */
export async function speakArgos(text: string): Promise<void> {
  const cleanText = cleanForSpeech(text);
  if (!cleanText) return;

  if (isSpeaking) await stopSpeaking();

  return new Promise((resolve) => {
    isSpeaking = true;
    Speech.speak(cleanText, {
      language: 'es-MX',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => { isSpeaking = false; resolve(); },
      onError: () => { isSpeaking = false; resolve(); },
      onStopped: () => { isSpeaking = false; resolve(); },
    });
  });
}

/** Detiene el speech actual */
export async function stopSpeaking(): Promise<void> {
  isSpeaking = false;
  await Speech.stop();
}

/** Devuelve si ARGOS está hablando */
export function getIsSpeaking(): boolean {
  return isSpeaking;
}
