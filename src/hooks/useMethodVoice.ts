/**
 * useMethodVoice (MB-3 Track E) — voz unificada para los métodos ATP y el
 * runner de fuerza. Mismo criterio que use-routine-engine: respeta
 * settings.voiceEnabled / voiceLanguage; el cue es no-op con la voz apagada.
 */
import { useCallback, useEffect } from 'react';
import { speak, stopSpeech } from '@/src/utils/speech';
import { useSettings } from '@/src/contexts/settings-context';

export function useMethodVoice() {
  const { settings } = useSettings();

  const cue = useCallback((text: string) => {
    if (settings.voiceEnabled) speak(text, settings.voiceLanguage);
  }, [settings.voiceEnabled, settings.voiceLanguage]);

  // Al desmontar la pantalla que habla, se calla.
  useEffect(() => () => stopSpeech(), []);

  return { cue, stop: stopSpeech };
}
