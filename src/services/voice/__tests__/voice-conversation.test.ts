/**
 * MB-4 fixes auditoría — voice-conversation con MOCKS de red/audio.
 *
 * Cubre exactamente el gap que señaló la auditoría (B2 y B4 vivían aquí):
 *  - B2: el userText transcrito se expone (onUserTranscript + done.userText)
 *        y los roles del turno son correctos (user dijo X, ARGOS respondió Y).
 *  - B4: la cola de playback espera el FIN REAL de cada clip (nada de timers)
 *        y el orb no parpadea a idle entre chunks.
 *  - H4: 402 del proxy → onNoProtons (mensaje honesto), no onFallbackToText.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateResponseStream: vi.fn(),
  synthesizeSpeech: vi.fn(),
  playAudioFileToEnd: vi.fn(),
  stopPlayback: vi.fn(async () => {}),
  transcribeAudio: vi.fn(),
}));

vi.mock('@/src/services/argos-service', () => ({
  generateResponseStream: mocks.generateResponseStream,
}));
vi.mock('@/src/services/argos-tts', () => ({
  synthesizeSpeech: mocks.synthesizeSpeech,
  playAudioFileToEnd: mocks.playAudioFileToEnd,
  stopPlayback: mocks.stopPlayback,
  transcribeAudio: mocks.transcribeAudio,
}));
vi.mock('@/src/services/argos-voice-service', () => ({
  resolveArgosVoice: (v: unknown) => (v === 'femenina' ? 'femenina' : 'masculina'),
}));
vi.mock('@/src/utils/uuid', () => ({ generateUUID: () => 'test-uuid' }));

import { runVoiceTurn, type VoiceTurnState } from '../voice-conversation';

const FRASE_1 = 'Primera frase suficientemente larga. ';
const FRASE_2 = 'Segunda frase igual de larga que la otra. ';

function streamOf(...pieces: string[]) {
  mocks.generateResponseStream.mockImplementation(async function* () {
    for (const p of pieces) yield p;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stopPlayback.mockImplementation(async () => {});
  mocks.synthesizeSpeech.mockImplementation(async (text: string) => ({ uri: `clip:${text.trim()}` }));
  mocks.playAudioFileToEnd.mockResolvedValue(true);
});

describe('B2 — userText expuesto y roles correctos', () => {
  it('transcribe el audio del user, lo expone vía onUserTranscript y done.userText', async () => {
    mocks.transcribeAudio.mockResolvedValue('hola argos');
    streamOf(FRASE_1);
    const transcripts: string[] = [];

    const handle = runVoiceTurn({
      userId: 'u1',
      history: [],
      userAudioBase64: 'QUJD',
      callbacks: { onUserTranscript: (t) => transcripts.push(t) },
    });
    const result = await handle.done;

    expect(transcripts).toEqual(['hola argos']);
    // El resultado trae cada texto con su rol — el caller arma el historial sin adivinar.
    expect(result.userText).toBe('hola argos');
    expect(result.argosText).toBe(FRASE_1);
  });

  it('el mensaje del user entra al LLM con rol user, encima del historial previo', async () => {
    mocks.transcribeAudio.mockResolvedValue('segundo turno');
    streamOf(FRASE_1);
    const history = [
      { role: 'user' as const, content: 'turno 1 del user' },
      { role: 'assistant' as const, content: 'respuesta 1 de ARGOS' },
    ];

    await runVoiceTurn({ userId: 'u1', history, userAudioBase64: 'QUJD' }).done;

    const messages = mocks.generateResponseStream.mock.calls[0][1];
    expect(messages).toEqual([
      ...history,
      { role: 'user', content: 'segundo turno' },
    ]);
    // requestType voz (cobro server-side) intacto
    expect(mocks.generateResponseStream.mock.calls[0][2]).toMatchObject({ requestType: 'voice_turn' });
  });

  it('sin transcripción → turno vacío, sin llamada al LLM', async () => {
    mocks.transcribeAudio.mockResolvedValue(null);
    const result = await runVoiceTurn({ userId: 'u1', history: [], userAudioBase64: 'QUJD' }).done;
    expect(result).toEqual({ userText: '', argosText: '' });
    expect(mocks.generateResponseStream).not.toHaveBeenCalled();
  });
});

describe('B4 — cola de playback secuencial (fin real, no timers)', () => {
  it('no arranca el clip N+1 hasta que el clip N terminó de sonar', async () => {
    streamOf(FRASE_1, FRASE_2);
    const resolvers: Array<(ok: boolean) => void> = [];
    mocks.playAudioFileToEnd.mockImplementation(
      () => new Promise<boolean>((res) => resolvers.push(res)),
    );
    // stopPlayback real despierta al waiter; el mock simula ese contrato.
    mocks.stopPlayback.mockImplementation(async () => {
      resolvers.splice(0).forEach((r) => r(true));
    });

    const handle = runVoiceTurn({ userId: 'u1', history: [], userText: 'hola' });

    await vi.waitFor(() => expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(1));
    // El stream ya produjo ambos chunks, pero el 2º NO suena hasta que acabe el 1º.
    await vi.waitFor(() => expect(mocks.synthesizeSpeech).toHaveBeenCalledTimes(2));
    expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(1);

    resolvers.shift()!(true);
    await vi.waitFor(() => expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(2));
    resolvers.shift()!(true);

    const result = await handle.done;
    expect(result.argosText).toBe(FRASE_1 + FRASE_2);
    // Orden de reproducción = orden del texto
    expect(mocks.playAudioFileToEnd.mock.calls.map((c) => c[0])).toEqual([
      `clip:${FRASE_1.trim()}`,
      `clip:${FRASE_2.trim()}`,
    ]);
  });

  it("'idle' se declara UNA vez al final — sin parpadeo hablando→idle entre chunks", async () => {
    streamOf(FRASE_1, FRASE_2);
    const states: VoiceTurnState[] = [];

    await runVoiceTurn({
      userId: 'u1', history: [], userText: 'hola',
      callbacks: { onState: (s) => states.push(s) },
    }).done;

    expect(states.filter((s) => s === 'idle')).toHaveLength(1);
    expect(states[states.length - 1]).toBe('idle');
    expect(states).toContain('hablando');
  });

  it('done resuelve hasta que el audio drenó (no al cerrar el stream)', async () => {
    streamOf(FRASE_1);
    let finishClip: ((ok: boolean) => void) | null = null;
    mocks.playAudioFileToEnd.mockImplementation(
      () => new Promise<boolean>((res) => { finishClip = res; }),
    );

    const handle = runVoiceTurn({ userId: 'u1', history: [], userText: 'hola' });
    let settled = false;
    handle.done.then(() => { settled = true; });

    await vi.waitFor(() => expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(settled).toBe(false); // el clip sigue sonando → el turno sigue vivo (barge-in posible)

    finishClip!(true);
    await handle.done;
  });

  it('M4: el barge-in aborta la síntesis TTS en vuelo (la señal llega abortada)', async () => {
    streamOf(FRASE_1);
    let seenSignal: AbortSignal | undefined;
    let releaseSynth: (() => void) | null = null;
    mocks.synthesizeSpeech.mockImplementation(
      (_t: string, _v: string, opts?: { signal?: AbortSignal }) => {
        seenSignal = opts?.signal;
        return new Promise((res) => { releaseSynth = () => res(null); });
      },
    );

    const handle = runVoiceTurn({ userId: 'u1', history: [], userText: 'hola' });
    await vi.waitFor(() => expect(mocks.synthesizeSpeech).toHaveBeenCalledTimes(1));
    expect(seenSignal?.aborted).toBe(false);

    handle.abort();
    expect(seenSignal?.aborted).toBe(true); // el fetch en vuelo se cancela

    releaseSynth!();
    await handle.done;
  });

  it('abort corta el playback y el turno termina', async () => {
    streamOf(FRASE_1, FRASE_2);
    const resolvers: Array<(ok: boolean) => void> = [];
    mocks.playAudioFileToEnd.mockImplementation(
      () => new Promise<boolean>((res) => resolvers.push(res)),
    );
    mocks.stopPlayback.mockImplementation(async () => {
      resolvers.splice(0).forEach((r) => r(true));
    });

    const handle = runVoiceTurn({ userId: 'u1', history: [], userText: 'hola' });
    await vi.waitFor(() => expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(1));

    handle.abort();
    await handle.done;
    expect(mocks.stopPlayback).toHaveBeenCalled();
    expect(mocks.playAudioFileToEnd).toHaveBeenCalledTimes(1); // el 2º clip nunca sonó
  });
});

describe('H4 — sin H+ en modo voz: mensaje honesto', () => {
  it('proxy_402 → onNoProtons, NO onFallbackToText', async () => {
    mocks.generateResponseStream.mockImplementation(async function* () {
      yield* []; // generator tipado
      throw new Error('proxy_402: {"error":{"type":"insufficient_protons"}}');
    });
    const onNoProtons = vi.fn();
    const onFallbackToText = vi.fn();

    await runVoiceTurn({
      userId: 'u1', history: [], userText: 'hola',
      callbacks: { onNoProtons, onFallbackToText },
    }).done;

    expect(onNoProtons).toHaveBeenCalledTimes(1);
    expect(onFallbackToText).not.toHaveBeenCalled();
  });

  it('error genérico del stream sin audio → onFallbackToText (una sola vez)', async () => {
    mocks.generateResponseStream.mockImplementation(async function* () {
      yield FRASE_1;
      throw new Error('stream_failed: network');
    });
    mocks.synthesizeSpeech.mockResolvedValue(null); // voz no disponible
    const onFallbackToText = vi.fn();
    const onNoProtons = vi.fn();

    const result = await runVoiceTurn({
      userId: 'u1', history: [], userText: 'hola',
      callbacks: { onFallbackToText, onNoProtons },
    }).done;

    expect(onFallbackToText).toHaveBeenCalledTimes(1);
    expect(onNoProtons).not.toHaveBeenCalled();
    expect(result.argosText).toBe(FRASE_1); // el texto acumulado se conserva
  });
});
