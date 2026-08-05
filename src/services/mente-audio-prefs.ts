/**
 * Preferencias de audio del pilar Mente (MB-23 P5) — locales al device,
 * como el modo completo de Salud: es cómo quiere escuchar SU sesión, no hay
 * nada que sincronizar.
 *
 * ⚠️ UNA sola perilla de volumen. Cada pieza es un archivo YA MEZCLADO (voz
 * y fondo fundidos en el ffmpeg del pipeline): deslizadores separados de voz
 * y ambiente moverían lo mismo, y un control que miente es peor que no
 * tenerlo. El día que las piezas se re-rendericen solo-voz con loop
 * ambiental aparte (decisión de contenido, no de código), este store crece.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@atp/mente_audio_prefs';

export interface MenteAudioPrefs {
  /** Volumen de la pieza, 0–1 (el player nace con él y cambia en vivo). */
  volume: number;
  /** Campana al empezar y al terminar la pieza — o silencio. */
  bellEnabled: boolean;
  /** Respiración: vibración en vez de sonido (teléfono en silencio). */
  breathVibrateOnly: boolean;
}

export const MENTE_AUDIO_DEFAULTS: MenteAudioPrefs = {
  volume: 1,
  bellEnabled: true,
  breathVibrateOnly: false,
};

export async function loadMenteAudioPrefs(): Promise<MenteAudioPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...MENTE_AUDIO_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : MENTE_AUDIO_DEFAULTS.volume,
      bellEnabled: parsed.bellEnabled !== false,
      breathVibrateOnly: parsed.breathVibrateOnly === true,
    };
  } catch {
    return { ...MENTE_AUDIO_DEFAULTS };
  }
}

export async function saveMenteAudioPrefs(patch: Partial<MenteAudioPrefs>): Promise<MenteAudioPrefs> {
  const current = await loadMenteAudioPrefs();
  const next = { ...current, ...patch };
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* mejor esfuerzo */ }
  return next;
}
