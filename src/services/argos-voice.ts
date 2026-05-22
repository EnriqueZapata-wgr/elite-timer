/**
 * ARGOS Voice — TTS para respuestas de ARGOS.
 * Limpia markdown antes de hablar y controla el estado de speech.
 */
import * as Speech from 'expo-speech';

let isSpeaking = false;

/**
 * Limpia markdown + emojis del texto antes de pasarlo al motor TTS.
 * El TTS no debe pronunciar guiones, asteriscos, almohadillas ni describir
 * emojis. La salida es texto plano legible en voz.
 *
 * NOTA: esta función NO modifica el texto que se renderiza en pantalla,
 * solo el que se entrega a `Speech.speak`.
 */
function cleanForSpeech(text: string): string {
  return text
    // 1. Bloques de código fenced (```...```) → quitar completos
    .replace(/```[\s\S]*?```/g, '')
    // 2. Inline code `txt` → preservar contenido, sin backticks
    .replace(/`([^`]*)`/g, '$1')
    .replace(/`/g, '')
    // 3. Imágenes ![alt](url) → quitar completo (antes que los links)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // 4. Links [texto](url) → solo "texto"
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 5. Headings #..###### (con o sin espacio) al inicio o en línea
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n#{1,6}\s*/g, '\n')
    // 6. Énfasis: **bold**, __bold__, *italic*, _italic_, ~~strike~~
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/~~/g, '')
    // 7. Listas (al inicio de línea): - * + y numeradas
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 8. Blockquotes
    .replace(/^>\s*/gm, '')
    // 9. Debug tags
    .replace(/\[DEBUG\].*/g, '')
    // 10. Emojis (Extended_Pictographic cubre la inmensa mayoría)
    .replace(/\p{Extended_Pictographic}/gu, '')
    // 11. Saltos de línea → pausas
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    // 12. Colapsar espacios múltiples (resultado de los replaces anteriores)
    .replace(/\s{2,}/g, ' ')
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
