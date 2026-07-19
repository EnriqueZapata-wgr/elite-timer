/**
 * voice-conversation — orquestador de UN turno de voz de ARGOS (MB-4 J5).
 *
 * Pipeline del "<2s primer audio" (spec §4.2):
 *   audio del user → STT (Gemini) → LLM token-stream (Claude, requestType='voice_turn'
 *   → cobra H+ server-side) → SentenceChunker → TTS por chunk (ElevenLabs) →
 *   cola de reproducción secuencial. NO se espera la respuesta completa: el primer
 *   chunk se sintetiza y suena en cuanto cierra la primera frase.
 *
 * Interrumpible (barge-in): `abort()` corta stream + TTS + playback y el orb vuelve
 * a idle. Fallback: si la voz no está disponible, devuelve el texto (nunca voz mala).
 *
 * No es puro (toca red/audio) → no tiene test unitario; la lógica de corte que lo
 * hace posible sí (voice-chunker-core.test). Verificación real = device (gate Enrique).
 */
import { generateResponseStream } from '@/src/services/argos-service';
import { synthesizeSpeech, playAudioFile, stopPlayback, transcribeAudio } from '@/src/services/argos-tts';
import { SentenceChunker } from '@/src/services/voice/voice-chunker-core';
import { resolveArgosVoice, type ArgosVoice } from '@/src/services/argos-voice-service';
import { generateUUID } from '@/src/utils/uuid';

export type VoiceTurnState = 'idle' | 'escuchando' | 'pensando' | 'hablando';

export interface VoiceTurnCallbacks {
  /** Cambia el estado del orb. */
  onState?: (s: VoiceTurnState) => void;
  /** Texto acumulado de ARGOS (para render + fallback visual). */
  onText?: (fullText: string) => void;
  /** true si el turno cayó a texto (voz no disponible). */
  onFallbackToText?: () => void;
}

export interface VoiceTurnHandle {
  /** Barge-in: corta todo y vuelve a idle. */
  abort: () => void;
  /** Promesa que resuelve con el texto final del turno. */
  done: Promise<string>;
}

/**
 * Ejecuta un turno de voz. `userAudioBase64` es el audio capturado (o pasa
 * `userText` si ya viene transcrito por STT on-device).
 */
export function runVoiceTurn(params: {
  userId: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userAudioBase64?: string;
  userText?: string;
  audioMime?: string;
  voice?: string | null;
  callbacks?: VoiceTurnCallbacks;
}): VoiceTurnHandle {
  const { userId, history, callbacks } = params;
  const voice: ArgosVoice = resolveArgosVoice(params.voice);
  let aborted = false;

  const abort = () => {
    aborted = true;
    stopPlayback().catch(() => {});
    callbacks?.onState?.('idle');
  };

  const done = (async (): Promise<string> => {
    // 1) STT (si vino audio). El orb muestra 'pensando' mientras transcribe+razona.
    callbacks?.onState?.('pensando');
    let userText = params.userText ?? '';
    if (!userText && params.userAudioBase64) {
      userText = (await transcribeAudio(params.userAudioBase64, params.audioMime)) ?? '';
    }
    if (aborted) return '';
    if (!userText.trim()) { callbacks?.onState?.('idle'); return ''; }

    const messages = [...history, { role: 'user' as const, content: userText }];

    // 2) LLM token-stream → chunker → cola TTS. Cola secuencial de URIs de audio.
    const chunker = new SentenceChunker();
    const audioQueue: string[] = [];
    let playing = false;
    let full = '';
    let spokeAny = false;

    const pump = async () => {
      if (playing || aborted) return;
      playing = true;
      while (audioQueue.length && !aborted) {
        const uri = audioQueue.shift()!;
        callbacks?.onState?.('hablando');
        spokeAny = true;
        const ok = await playAudioFile(uri);
        if (!ok) break; // audio no disponible → dejamos que el fallback de texto cubra
        // Espera aproximada a que suene (expo-audio no expone "ended" simple aquí);
        // se encola la siguiente; el device gate afina la sincronía real.
        await new Promise((r) => setTimeout(r, 40));
      }
      playing = false;
      if (!audioQueue.length && !aborted) callbacks?.onState?.('idle');
    };

    const speakChunk = async (chunk: string) => {
      if (aborted) return;
      const clip = await synthesizeSpeech(chunk, voice);
      if (aborted) return;
      if (clip) { audioQueue.push(clip.uri); pump(); }
    };

    try {
      const idem = generateUUID();
      for await (const piece of generateResponseStream(userId, messages, {
        requestType: 'voice_turn', // ← cobra H+ como voz (server-side)
        idempotencyKey: idem,
      })) {
        if (aborted) break;
        full += piece;
        callbacks?.onText?.(full);
        for (const chunk of chunker.push(piece)) await speakChunk(chunk);
      }
      if (!aborted) {
        for (const chunk of chunker.flush()) await speakChunk(chunk);
      }
    } catch {
      // El stream murió (server ya reembolsó H+). Fallback: el texto ya
      // acumulado se muestra; si no habló nada, avisamos fallback a texto.
      if (!spokeAny) callbacks?.onFallbackToText?.();
    }

    if (!spokeAny && full) callbacks?.onFallbackToText?.();
    return full;
  })();

  return { abort, done };
}
