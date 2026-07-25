/**
 * useMethodVoice (MB-3 Track E · MB-3.5 #6) — voz unificada para los métodos
 * ATP y el runner de fuerza. Respeta settings.voiceEnabled / voiceLanguage
 * (global) Y settings.fitnessVoice (todo · solo hitos · apagada):
 *   - 'todo': habla todos los cues (cuentas 3-2-1, rondas, descansos…).
 *   - 'hitos': solo los marcados { hito: true } (anuncio de ejercicio,
 *     feedback de peso, cierre de sesión, ¡Vamos!).
 *   - 'off': silencio en Fitness (la voz global del timer no se toca).
 */
import { useCallback, useEffect } from 'react';
import { speak, stopSpeech } from '@/src/utils/speech';
import { useSettings } from '@/src/contexts/settings-context';

export interface CueOptions {
  /** Marca el cue como hito (se habla también en modo 'hitos'). */
  hito?: boolean;
}

export type MethodCue = (text: string, opts?: CueOptions) => void;

export function useMethodVoice() {
  const { settings } = useSettings();

  const cue = useCallback<MethodCue>((text, opts) => {
    if (!settings.voiceEnabled) return;
    if (settings.fitnessVoice === 'off') return;
    if (settings.fitnessVoice === 'hitos' && !opts?.hito) return;
    speak(text, settings.voiceLanguage);
  }, [settings.voiceEnabled, settings.voiceLanguage, settings.fitnessVoice]);

  // Al desmontar la pantalla que habla, se calla.
  useEffect(() => () => stopSpeech(), []);

  return { cue, stop: stopSpeech };
}
