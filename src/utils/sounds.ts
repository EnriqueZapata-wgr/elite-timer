/**
 * Sounds — Genera y reproduce tonos de audio sin archivos externos.
 *
 * Crea WAV en memoria como data URI → reproduce con expo-av Audio.Sound.
 * Soporta 5 estilos de sonido, cada uno con frecuencias y formas de onda distintas.
 *
 * Nota: expo-av está deprecado en SDK 54 pero sigue funcional.
 * Se migrará a expo-audio cuando soporte uso imperativo (no-hook).
 */
import { Audio } from 'expo-av';

// === GENERADOR DE WAV ===

function generateWav(opts: {
  frequency: number;
  frequencyEnd?: number;
  durationMs: number;
  volume?: number;
  type?: 'sine' | 'square' | 'triangle';
}): string {
  const { frequency, frequencyEnd, durationMs, volume = 0.5, type = 'sine' } = opts;
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const dataSize = numSamples * 2;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const freq = frequencyEnd ? frequency + (frequencyEnd - frequency) * t : frequency;
    phase += (2 * Math.PI * freq) / sampleRate;

    let s: number;
    switch (type) {
      case 'square': s = Math.sin(phase) >= 0 ? 1 : -1; break;
      case 'triangle': s = (2 / Math.PI) * Math.asin(Math.sin(phase)); break;
      default: s = Math.sin(phase);
    }

    // Envelope: fade in 5ms + fade out último 20%
    const fadeIn = Math.floor(sampleRate * 0.005);
    const fadeOutStart = Math.floor(numSamples * 0.8);
    if (i < fadeIn) s *= i / fadeIn;
    else if (i > fadeOutStart) s *= (numSamples - i) / (numSamples - fadeOutStart);

    view.setInt16(headerSize + i * 2, Math.floor(Math.max(-1, Math.min(1, s * volume)) * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function generateDoubleTone(freq: number, durationMs: number, gapMs: number, vol: number = 0.5): string {
  const sr = 22050;
  const toneSamples = Math.floor(sr * durationMs / 1000);
  const gapSamples = Math.floor(sr * gapMs / 1000);
  const total = toneSamples * 2 + gapSamples;
  const dataSize = total * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeStr(view, 0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, 'WAVE'); writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(view, 36, 'data'); view.setUint32(40, dataSize, true);

  for (let i = 0; i < total; i++) {
    let s = 0;
    const inFirst = i < toneSamples;
    const inSecond = i >= toneSamples + gapSamples;
    if (inFirst || inSecond) {
      const li = inFirst ? i : i - toneSamples - gapSamples;
      s = Math.sin(2 * Math.PI * freq * li / sr) * vol;
      if (li < 50) s *= li / 50;
      if (li > toneSamples - 50) s *= (toneSamples - li) / 50;
    }
    view.setInt16(44 + i * 2, Math.floor(s * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeStr(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// === ESTILOS DE SONIDO ===

interface SoundSet {
  transition: string;
  countdown: string;
  complete: string;
}

const SOUND_SETS: Record<string, SoundSet> = {
  digital: {
    transition: generateWav({ frequency: 800, durationMs: 200, volume: 0.5 }),
    countdown: generateWav({ frequency: 1000, durationMs: 100, volume: 0.4 }),
    complete: generateWav({ frequency: 600, frequencyEnd: 1200, durationMs: 400, volume: 0.5 }),
  },
  boxing: {
    transition: generateWav({ frequency: 400, durationMs: 500, volume: 0.5, type: 'triangle' }),
    countdown: generateWav({ frequency: 500, durationMs: 150, volume: 0.4, type: 'triangle' }),
    complete: generateWav({ frequency: 300, durationMs: 800, volume: 0.5, type: 'triangle' }),
  },
  whistle: {
    transition: generateWav({ frequency: 600, frequencyEnd: 1200, durationMs: 400, volume: 0.5 }),
    countdown: generateWav({ frequency: 800, frequencyEnd: 1000, durationMs: 150, volume: 0.4 }),
    complete: generateWav({ frequency: 500, frequencyEnd: 1500, durationMs: 600, volume: 0.5 }),
  },
  military: {
    transition: generateDoubleTone(500, 150, 50, 0.5),
    countdown: generateWav({ frequency: 600, durationMs: 80, volume: 0.4, type: 'square' }),
    complete: generateDoubleTone(600, 200, 100, 0.5),
  },
  silent: { transition: '', countdown: '', complete: '' },
};

// === CACHE DE AUDIO.SOUND PRECARGADOS ===

const cache: Map<string, Audio.Sound> = new Map();
let isInitialized = false;
let currentStyle = 'digital';

/** Precarga un WAV en un Audio.Sound listo para reproducir */
async function preload(key: string, uri: string): Promise<void> {
  if (!uri) return;
  try {
    const old = cache.get(key);
    if (old) { try { await old.unloadAsync(); } catch {} }
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    cache.set(key, sound);
  } catch (e) {
    console.warn(`[sounds] preload "${key}" falló:`, e);
  }
}

/** Precarga todos los sonidos del estilo actual */
async function preloadCurrentStyle(): Promise<void> {
  const set = SOUND_SETS[currentStyle] ?? SOUND_SETS.digital;
  await Promise.all([
    preload('transition', set.transition),
    preload('countdown', set.countdown),
    preload('complete', set.complete),
  ]);
}

/** Reproduce un sonido precargado del cache */
async function playCached(key: string, volume: number): Promise<void> {
  const sound = cache.get(key);
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    await sound.playAsync();
  } catch (e) {
    console.warn(`[sounds] play "${key}" falló:`, e);
  }
}

// === API PÚBLICA ===

/** Configura el estilo de sonido y precarga */
export function setSoundStyle(style: string): void {
  if (style === currentStyle && isInitialized) return;
  currentStyle = style;
  if (style !== 'silent') preloadCurrentStyle();
}

/** Inicializar sistema de audio — llamar al montar la pantalla de ejecución */
export async function initAudio(): Promise<void> {
  if (isInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch {}
  await preloadCurrentStyle();
  isInitialized = true;
}

export function playBeep(volume: number = 0.7): void { playCached('transition', volume); }
export function playCountdownTick(volume: number = 0.5): void { playCached('countdown', volume); }
export function playComplete(volume: number = 0.7): void { playCached('complete', volume); }

/** Reproduce sonido por nombre del engine */
export function playSound(name: string, volume: number = 0.7): void {
  switch (name) {
    case 'countdown': playCountdownTick(volume); break;
    case 'complete': case 'whistle': case 'bell': playComplete(volume); break;
    default: playBeep(volume);
  }
}

/** Limpiar cache al desmontar */
export async function cleanupAudio(): Promise<void> {
  for (const [, sound] of cache) {
    try { await sound.unloadAsync(); } catch {}
  }
  cache.clear();
  isInitialized = false;
}
