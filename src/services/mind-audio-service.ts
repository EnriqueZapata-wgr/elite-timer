/**
 * Mind Audio — reproductor de pistas largas del pilar Mente (MB-5).
 *
 * Binaurales / NSDR / meditaciones con voz. El REPRODUCTOR queda listo;
 * el CATÁLOGO está VACÍO a propósito (#46): las pistas son grabaciones que
 * el equipo tiene que producir, no código. Cuando existan, se agregan a
 * MIND_AUDIO_CATALOG (require local o { uri } remoto) y las pantallas de
 * Mente pueden listarlas sin tocar este servicio.
 *
 * - expo-audio (NUNCA expo-av, deprecado en SDK 54), import PEREZOSO:
 *   sin módulo nativo en el binario degrada a no-op, jamás crashea por OTA.
 * - Background + pantalla bloqueada: setAudioModeAsync(shouldPlayInBackground)
 *   + UIBackgroundModes ["audio"] en app.json (requiere build nativo).
 * - Una sola pista activa a la vez (modelo "sesión", no mezclador).
 */

export type MindAudioKind = 'binaural' | 'nsdr' | 'guided';

export interface MindAudioTrack {
  id: string;
  title: string;
  kind: MindAudioKind;
  /** require('...mp3') local o { uri } remoto. */
  source: number | { uri: string };
  durationSeconds: number;
  /** Los binaurales suelen reproducirse en loop hasta terminar la sesión. */
  loop?: boolean;
}

/** #46: vacío hasta tener las grabaciones. NO llenar con audio de stock. */
export const MIND_AUDIO_CATALOG: MindAudioTrack[] = [];

export function getMindAudioTracks(kind?: MindAudioKind): MindAudioTrack[] {
  return kind ? MIND_AUDIO_CATALOG.filter((t) => t.kind === kind) : MIND_AUDIO_CATALOG;
}

// ─── Reproductor (una pista activa) ───

type ExpoAudio = typeof import('expo-audio');
type AudioPlayer = import('expo-audio').AudioPlayer;

let audioMod: ExpoAudio | null = null;
async function getAudioMod(): Promise<ExpoAudio | null> {
  if (audioMod) return audioMod;
  try {
    audioMod = await import('expo-audio');
    return audioMod;
  } catch {
    return null;
  }
}

let current: { track: MindAudioTrack; player: AudioPlayer } | null = null;

/**
 * Carga y reproduce una pista (detiene la anterior si había).
 * Devuelve false si el audio no está disponible (módulo nativo ausente o error).
 */
export async function playMindAudio(track: MindAudioTrack, volume = 1): Promise<boolean> {
  const audio = await getAudioMod();
  if (!audio) return false;
  try {
    await audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    await stopMindAudio();
    const player = audio.createAudioPlayer(track.source);
    player.loop = track.loop ?? track.kind === 'binaural';
    player.volume = Math.max(0, Math.min(1, volume));
    player.play();
    current = { track, player };
    return true;
  } catch {
    return false;
  }
}

export function pauseMindAudio(): void {
  try { current?.player.pause(); } catch { /* fail-soft */ }
}

export function resumeMindAudio(): void {
  try { current?.player.play(); } catch { /* fail-soft */ }
}

/** Detiene y libera la pista activa. */
export async function stopMindAudio(): Promise<void> {
  if (!current) return;
  const { player } = current;
  current = null;
  try { player.pause(); } catch { /* fail-soft */ }
  try { player.remove(); } catch { /* fail-soft */ }
}

export function getCurrentMindAudio(): MindAudioTrack | null {
  return current?.track ?? null;
}
