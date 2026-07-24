/**
 * N-Back — canal auditivo (8 letras habladas).
 *
 * Las grabaciones de Enrique (spec §6: nback_a/o/u/f/l/m/r/s) aún no llegan al
 * repo. CABLEADO LISTO PARA EL SWAP: cuando estén, van a
 * `assets/audio/nback/nback_<letra>.m4a` y se llena LETTER_ASSETS con
 * require() — el pool de players las usa automáticamente. Mientras tanto el
 * fallback habla la letra con expo-speech (es-MX, ya en el binario) — mismo
 * contrato, cero cambio en el juego.
 *
 * Nativos SIEMPRE lazy (doctrina): expo-audio y expo-speech se importan
 * dinámico; sin módulo → el canal degrada a silencio sin crashear (y la UI
 * avisa que actualice).
 */
import { NBACK_CONFIG, LETTER_SPOKEN, type NBackLetter } from './nback-core';

// Cuando lleguen los archivos: descomentar/llenar con require() estático.
// const LETTER_ASSETS: Partial<Record<NBackLetter, number>> = {
//   a: require('@/assets/audio/nback/nback_a.m4a'), ...
// };
const LETTER_ASSETS: Partial<Record<NBackLetter, number>> = {};

type ExpoAudio = typeof import('expo-audio');
type AudioPlayer = import('expo-audio').AudioPlayer;
type ExpoSpeech = typeof import('expo-speech');

export interface NBackAudioHandle {
  /** true si hay CUALQUIER vía de audio (assets o TTS). */
  ready: boolean;
  /** true cuando suenan las grabaciones reales (no TTS). */
  usingRecordings: boolean;
  play(letterIndex: number): void;
  dispose(): void;
}

/** Crea el canal auditivo. Llamar al montar la sesión; dispose al salir. */
export async function createNBackAudio(): Promise<NBackAudioHandle> {
  const letters = NBACK_CONFIG.LETTERS;
  const players = new Map<NBackLetter, AudioPlayer>();
  let speech: ExpoSpeech | null = null;

  const hasAssets = letters.every(l => LETTER_ASSETS[l] != null);
  if (hasAssets) {
    try {
      const mod: ExpoAudio = await import('expo-audio');
      try {
        await mod.setAudioModeAsync({
          playsInSilentMode: true, // decisión #44-3: el canal auditivo es obligatorio
          interruptionMode: 'doNotMix',
        });
      } catch { /* modo default */ }
      for (const l of letters) {
        players.set(l, mod.createAudioPlayer(LETTER_ASSETS[l]!));
      }
    } catch {
      players.clear(); // sin expo-audio → caer a TTS
    }
  }
  if (players.size === 0) {
    try { speech = await import('expo-speech'); } catch { speech = null; }
  }

  const usingRecordings = players.size > 0;
  return {
    ready: usingRecordings || !!speech,
    usingRecordings,
    play(letterIndex: number) {
      const letter = letters[letterIndex];
      if (!letter) return;
      if (usingRecordings) {
        const p = players.get(letter);
        try { p?.seekTo(0); p?.play(); } catch { /* trial sigue */ }
        return;
      }
      try {
        speech?.stop();
        speech?.speak(LETTER_SPOKEN[letter], { language: 'es-MX', rate: 1.05 });
      } catch { /* trial sigue */ }
    },
    dispose() {
      for (const p of players.values()) { try { p.remove(); } catch { /* no-op */ } }
      players.clear();
      try { speech?.stop(); } catch { /* no-op */ }
    },
  };
}
