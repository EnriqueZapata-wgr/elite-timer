/**
 * Sounds — Genera y reproduce tonos de audio sin archivos externos.
 *
 * Crea WAV en memoria como data URI → reproduce con expo-av.
 * Funciona en iOS, Android y web sin dependencias externas.
 */
import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

// === GENERADOR DE WAV ===

/**
 * Genera un WAV mono 16-bit como data URI base64.
 * Permite crear beeps, campanas y silbatos sin archivos .mp3.
 */
function generateWav(
  frequency: number,
  durationMs: number,
  volume: number = 0.5,
  type: 'sine' | 'square' | 'triangle' = 'sine',
): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const bitsPerSample = 16;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Generar samples PCM
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample: number;

    // Forma de onda
    const phase = 2 * Math.PI * frequency * t;
    switch (type) {
      case 'square':
        sample = Math.sin(phase) >= 0 ? 1 : -1;
        break;
      case 'triangle':
        sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      default: // sine
        sample = Math.sin(phase);
    }

    // Envelope: fade in (5ms) + fade out (20% final)
    const fadeInSamples = Math.floor(sampleRate * 0.005);
    const fadeOutStart = Math.floor(numSamples * 0.8);
    if (i < fadeInSamples) {
      sample *= i / fadeInSamples;
    } else if (i > fadeOutStart) {
      sample *= (numSamples - i) / (numSamples - fadeOutStart);
    }

    // Aplicar volumen y convertir a int16
    const value = Math.max(-1, Math.min(1, sample * volume));
    view.setInt16(headerSize + i * 2, Math.floor(value * 32767), true);
  }

  // Convertir a base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// === TONOS PRE-GENERADOS ===

// Se generan una vez al importar el módulo (son strings, no consumen memoria significativa)
const BEEP_WAV = generateWav(880, 200, 0.4, 'sine');       // Tono agudo corto
const BELL_WAV = generateWav(660, 500, 0.5, 'triangle');   // Campana suave
const WHISTLE_WAV = generateWav(900, 300, 0.4, 'sine');    // Tono alto
const TICK_WAV = generateWav(1000, 100, 0.3, 'sine');      // Tick countdown

// === CACHE DE SONIDOS PRECARGADOS ===

const soundCache: Map<string, Audio.Sound> = new Map();

/** Precarga un sonido en memoria para reproducción instantánea */
async function preloadSound(name: string, uri: string): Promise<void> {
  try {
    // Limpiar sonido anterior si existe
    const existing = soundCache.get(name);
    if (existing) {
      await existing.unloadAsync();
    }
    const source: AVPlaybackSource = { uri };
    const { sound } = await Audio.Sound.createAsync(source);
    soundCache.set(name, sound);
  } catch (e) {
    console.warn(`[sounds] No se pudo precargar "${name}":`, e);
  }
}

/** Reproduce un sonido del cache. Si no está precargado, lo carga on-the-fly. */
async function playCached(name: string, uri: string, volume: number = 1): Promise<void> {
  try {
    let sound = soundCache.get(name);
    if (!sound) {
      const source: AVPlaybackSource = { uri };
      const result = await Audio.Sound.createAsync(source);
      sound = result.sound;
      soundCache.set(name, sound);
    }
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    await sound.playAsync();
  } catch (e) {
    console.warn(`[sounds] Error reproduciendo "${name}":`, e);
  }
}

// === API PÚBLICA ===

/** Inicializar el sistema de audio (llamar al montar la pantalla de ejecución) */
export async function initAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    // Precargar todos los tonos
    await Promise.all([
      preloadSound('beep', BEEP_WAV),
      preloadSound('bell', BELL_WAV),
      preloadSound('whistle', WHISTLE_WAV),
      preloadSound('tick', TICK_WAV),
    ]);
  } catch (e) {
    console.warn('[sounds] Error inicializando audio:', e);
  }
}

/** Tono corto agudo (200ms) — transiciones entre steps */
export function playBeep(volume: number = 0.7): void {
  playCached('beep', BEEP_WAV, volume);
}

/** Campana (500ms) — fin de set / cambio de nivel */
export function playBell(volume: number = 0.7): void {
  playCached('bell', BELL_WAV, volume);
}

/** Tono alto (300ms) — fin de rutina */
export function playWhistle(volume: number = 0.7): void {
  playCached('whistle', WHISTLE_WAV, volume);
}

/** Tick sutil (100ms) — countdown */
export function playCountdownTick(volume: number = 0.5): void {
  playCached('tick', TICK_WAV, volume);
}

/**
 * Reproduce un sonido por nombre.
 * Mapea los nombres del engine a funciones de reproducción.
 */
export function playSound(name: string, volume: number = 0.7): void {
  switch (name) {
    case 'beep':
    case 'default':
      playBeep(volume);
      break;
    case 'bell':
      playBell(volume);
      break;
    case 'whistle':
    case 'complete':
      playWhistle(volume);
      break;
    case 'countdown':
      playCountdownTick(volume);
      break;
    default:
      playBeep(volume);
  }
}

/** Limpiar todos los sonidos del cache (llamar al desmontar) */
export async function cleanupAudio(): Promise<void> {
  for (const [, sound] of soundCache) {
    try { await sound.unloadAsync(); } catch { /* ya descargado */ }
  }
  soundCache.clear();
}
