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
 * No es puro (toca red/audio) → se testea con MOCKS de sus dependencias
 * (voice-conversation.test.ts: roles B2, cola secuencial B4, 402 honesto H4);
 * la lógica de corte pura vive en voice-chunker-core.test. Verificación final =
 * device (gate Enrique).
 */
import { generateResponseStream } from '@/src/services/argos-service';
import { synthesizeSpeech, playAudioFileToEnd, stopPlayback, transcribeAudio } from '@/src/services/argos-tts';
import { SentenceChunker } from '@/src/services/voice/voice-chunker-core';
import { resolveArgosVoice, type ArgosVoice } from '@/src/services/argos-voice-service';
import { generateUUID } from '@/src/utils/uuid';

export type VoiceTurnState = 'idle' | 'escuchando' | 'pensando' | 'hablando';

export interface VoiceTurnCallbacks {
  /** Cambia el estado del orb. */
  onState?: (s: VoiceTurnState) => void;
  /** Fix B2: transcripción de lo que dijo el USER (rol 'user' en el historial). */
  onUserTranscript?: (userText: string) => void;
  /** Texto acumulado de ARGOS (para render + fallback visual). */
  onText?: (fullText: string) => void;
  /** true si el turno cayó a texto (voz no disponible). */
  onFallbackToText?: () => void;
  /** H4: el proxy rechazó por falta de H+ (402) — el caller dice la verdad
   *  ("sin H+ para el modo voz"), no "te respondo por texto". */
  onNoProtons?: () => void;
}

/** Fix B2: el turno expone AMBOS textos con su rol — el caller arma el historial
 *  sin adivinar (antes el texto de ARGOS se colaba como mensaje del user). */
export interface VoiceTurnResult {
  userText: string;
  argosText: string;
}

export interface VoiceTurnHandle {
  /** Barge-in: corta todo y vuelve a idle. */
  abort: () => void;
  /** Resuelve cuando el turno terminó DE VERDAD: texto completo Y audio drenado. */
  done: Promise<VoiceTurnResult>;
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

  const done = (async (): Promise<VoiceTurnResult> => {
    // 1) STT (si vino audio). El orb muestra 'pensando' mientras transcribe+razona.
    callbacks?.onState?.('pensando');
    let userText = params.userText ?? '';
    if (!userText && params.userAudioBase64) {
      userText = (await transcribeAudio(params.userAudioBase64, params.audioMime)) ?? '';
    }
    if (aborted) return { userText: '', argosText: '' };
    if (!userText.trim()) { callbacks?.onState?.('idle'); return { userText: '', argosText: '' }; }
    // Fix B2: exponer lo que dijo el user — antes se perdía dentro del turno y
    // el caller inyectaba el texto de ARGOS con rol 'user'.
    callbacks?.onUserTranscript?.(userText);

    const messages = [...history, { role: 'user' as const, content: userText }];

    // 2) LLM token-stream → chunker → cola TTS. Cola secuencial de URIs de audio.
    const chunker = new SentenceChunker();
    const audioQueue: string[] = [];
    let playing = false;
    let pumpDone: Promise<void> = Promise.resolve();
    let full = '';
    let spokeAny = false;
    let audioBroken = false;
    let fellBack = false;

    const fallbackToText = () => {
      if (fellBack) return;
      fellBack = true;
      callbacks?.onFallbackToText?.();
    };

    // Fix B4: cada clip se espera hasta su FIN REAL (didJustFinish vía
    // playAudioFileToEnd) — antes un setTimeout(40) hacía que cada chunk matara
    // al anterior a media frase. El orb NO vuelve a idle entre chunks: idle se
    // declara una sola vez, al final del drain (adiós parpadeo hablando→idle).
    const pump = () => {
      if (playing || aborted) return;
      playing = true;
      pumpDone = (async () => {
        while (audioQueue.length && !aborted) {
          const uri = audioQueue.shift()!;
          callbacks?.onState?.('hablando');
          spokeAny = true;
          const ok = await playAudioFileToEnd(uri);
          if (!ok) {
            // Audio no disponible → descartar la cola; el fallback de texto cubre.
            audioBroken = true;
            audioQueue.length = 0;
            break;
          }
        }
        playing = false;
      })();
    };

    const speakChunk = async (chunk: string) => {
      if (aborted || audioBroken) return;
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
    } catch (e: any) {
      // H4: distinguir "sin H+" (402 del proxy) de "voz no disponible" — antes el
      // 402 llegaba como "te respondo por texto"… y no llegaba ningún texto.
      const msg = String(e?.message ?? e);
      if (msg.includes('proxy_402') || msg.includes('insufficient_protons')) {
        fellBack = true; // el mensaje honesto de H+ sustituye al de fallback
        callbacks?.onNoProtons?.();
      } else if (!spokeAny) {
        // El stream murió (server ya reembolsó H+). El texto acumulado se muestra.
        fallbackToText();
      }
    }

    // Fix B4: drenar la cola antes de cerrar el turno — `done` resuelve cuando el
    // audio realmente terminó (el barge-in por tap sigue vivo durante todo el habla).
    while (!aborted && (playing || audioQueue.length)) {
      if (!playing && audioQueue.length) pump();
      await pumpDone;
    }

    if (!spokeAny && full) fallbackToText();
    if (!aborted) callbacks?.onState?.('idle');
    return { userText, argosText: full };
  })();

  return { abort, done };
}
