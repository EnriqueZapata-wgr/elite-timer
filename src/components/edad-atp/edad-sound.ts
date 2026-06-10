/**
 * Sound design de la cinemática Edad ATP. No hay assets de audio en el repo todavía,
 * así que por ahora solo dispara haptics (flag #3 del buzón). Cuando Enrique agregue
 * los assets, reproducir aquí con expo-av/expo-audio respetando el silent mode.
 * Toggle "Sonidos Edad ATP" en settings (default ON).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptic } from '@/src/utils/haptics';

const KEY = 'edad_atp_sound_enabled';
let enabled = true;

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

// Cada función combina haptic + (TODO) sonido sutil.
export function playPhaseTick(): void {
  haptic.light();
  // TODO: tick sutil por fase (expo-av) si isSoundEnabled().
}
export function playReveal(): void {
  haptic.success();
  // TODO: chime ascendente en el reveal si isSoundEnabled().
}
export function playImprove(): void {
  haptic.success();
  // TODO: ding alegre al mejorar (recalcular) si isSoundEnabled().
}
