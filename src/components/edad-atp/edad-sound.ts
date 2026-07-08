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
 * con expo-av siguiendo el patrón de src/utils/sounds.ts (cache de
 * Audio.Sound precargados, replay con setPositionAsync).
 * Toggle "Sonidos Edad ATP" en Settings > Sonidos (default ON).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { haptic } from '@/src/utils/haptics';

const KEY = 'edad_atp_sound_enabled';
let enabled = true;

const ASSETS = {
  tick: require('@/assets/sounds/edad-atp/tick.wav'),
  chime: require('@/assets/sounds/edad-atp/chime.wav'),
  improve: require('@/assets/sounds/edad-atp/improve.wav'),
} as const;

type EdadSoundName = keyof typeof ASSETS;

const cache = new Map<EdadSoundName, Audio.Sound>();

async function getSound(name: EdadSoundName): Promise<Audio.Sound | null> {
  try {
    const cached = cache.get(name);
    if (cached) return cached;
    const { sound } = await Audio.Sound.createAsync(ASSETS[name], { shouldPlay: false });
    cache.set(name, sound);
    return sound;
  } catch {
    return null; // sin audio no se rompe la cinemática
  }
}

/** Fire-and-forget: reproduce si el toggle está ON. Nunca lanza. */
function play(name: EdadSoundName, volume = 0.6): void {
  if (!enabled) return;
  (async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const sound = await getSound(name);
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
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
  for (const s of cache.values()) {
    try { await s.unloadAsync(); } catch { /* */ }
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
