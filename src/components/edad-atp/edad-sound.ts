/**
 * Sound design de la cinemática Edad ATP (#69, sprint polish V1.3).
 *
 * Assets propios en assets/sounds/edad-atp/ (síntesis WAV 44.1kHz, sin
 * dependencias externas — decisión de criterio: en vez de bajar CC0 de
 * freesound se sintetizaron 3 sonidos editoriales sutiles):
 *   tick.wav    (~120ms) — click filtrado durante el cálculo
 *   chime.wav   (~550ms) — campana sutil en el reveal
 *   improve.wav (~650ms) — dos tonos ascendentes si tu Edad ATP mejoró
 *
 * Cada función combina haptic + sonido (si el toggle está ON). Playback
 * con expo-audio (MB-5: migrado de expo-av, deprecado en SDK 54) siguiendo
 * el patrón de src/utils/sounds.ts (cache de AudioPlayer precargados,
 * replay con seekTo(0); import perezoso — sin módulo nativo degrada a
 * silencio, nunca crashea).
 * Toggle "Sonidos Edad ATP" en Settings > Sonidos (default ON).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptic } from '@/src/utils/haptics';

type ExpoAudio = typeof import('expo-audio');
type AudioPlayer = import('expo-audio').AudioPlayer;

let audioMod: ExpoAudio | null = null;
async function getAudioMod(): Promise<ExpoAudio | null> {
  if (audioMod) return audioMod;
  try {
    audioMod = await import('expo-audio');
    return audioMod;
  } catch {
    return null; // sin audio no se rompe la cinemática
  }
}

const KEY = 'edad_atp_sound_enabled';
let enabled = true;

const ASSETS = {
  tick: require('@/assets/sounds/edad-atp/tick.wav'),
  chime: require('@/assets/sounds/edad-atp/chime.wav'),
  improve: require('@/assets/sounds/edad-atp/improve.wav'),
} as const;

type EdadSoundName = keyof typeof ASSETS;

const cache = new Map<EdadSoundName, AudioPlayer>();

async function getSound(name: EdadSoundName): Promise<AudioPlayer | null> {
  try {
    const cached = cache.get(name);
    if (cached) return cached;
    const audio = await getAudioMod();
    if (!audio) return null;
    const player = audio.createAudioPlayer(ASSETS[name]);
    cache.set(name, player);
    return player;
  } catch {
    return null; // sin audio no se rompe la cinemática
  }
}

/** Fire-and-forget: reproduce si el toggle está ON. Nunca lanza. */
function play(name: EdadSoundName, volume = 0.6): void {
  if (!enabled) return;
  (async () => {
    try {
      const audio = await getAudioMod();
      await audio?.setAudioModeAsync({ playsInSilentMode: true });
      const player = await getSound(name);
      if (!player) return;
      await player.seekTo(0);
      player.volume = volume;
      player.play();
    } catch { /* silencioso */ }
  })();
}

export async function loadSoundPref(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  enabled = v !== '0';
  return enabled;
}
export async function setSoundEnabled(on: boolean): Promise<void> {
  enabled = on;
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}
export function isSoundEnabled(): boolean {
  return enabled;
}

/** Libera los sonidos cacheados (llamar al desmontar la cinemática si se desea). */
export async function unloadEdadSounds(): Promise<void> {
  for (const p of cache.values()) {
    try { p.remove(); } catch { /* */ }
  }
  cache.clear();
}

// Cada función combina haptic + sonido sutil (#69).
export function playPhaseTick(): void {
  haptic.light();
  play('tick', 0.35);
}
export function playReveal(): void {
  haptic.success();
  play('chime', 0.6);
}
export function playImprove(): void {
  haptic.success();
  play('improve', 0.65);
}
