/**
 * SettingsContext — Preferencias del usuario para el timer.
 * Persiste en AsyncStorage. Cualquier pantalla lee con useSettings().
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registrarEscritores } from '@/src/services/argos-writers-bridge';

// === TIPOS ===

export type VoiceLanguage = 'es-MX' | 'en-US';
export type SoundStyle = 'digital' | 'boxing' | 'whistle' | 'military' | 'silent';
/** Voz de los métodos/runner de Fitness (MB-3.5 #6): todo · solo hitos · apagada. */
export type FitnessVoiceMode = 'todo' | 'hitos' | 'off';

export interface Settings {
  voiceEnabled: boolean;
  voiceLanguage: VoiceLanguage;
  countdownSpoken: boolean;
  fitnessVoice: FitnessVoiceMode;
  soundsEnabled: boolean;
  soundStyle: SoundStyle;
  soundVolume: number;
  vibrationEnabled: boolean;
  keepAwake: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  voiceEnabled: true,
  voiceLanguage: 'es-MX',
  countdownSpoken: true,
  fitnessVoice: 'todo',
  soundsEnabled: true,
  soundStyle: 'digital',
  soundVolume: 70,
  vibrationEnabled: true,
  keepAwake: true,
};

const STORAGE_KEY = '@elite/settings';

// === CONTEXTO ===

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Cargar desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(json => {
      if (json) {
        try {
          const saved = JSON.parse(json);
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
        } catch {
          // JSON corrupto — usar defaults
        }
      }
      setLoading(false);
    });
  }, []);

  // Actualizar una preferencia y persistir
  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // NOCHE-ARGOS P7: ARGOS alcanza estas preferencias por el puente. No puede
  // escribirlas solo: updateSetting serializa el objeto COMPLETO, así que un
  // servicio que tocara la clave por fuera tendría que replicar el merge y aun
  // así el provider no se enteraría hasta el próximo arranque.
  // El puente solo expone las tres de experiencia que están en la lista blanca
  // de ARGOS; la voz y el estilo de sonido NO se exponen a propósito.
  useEffect(() => {
    registrarEscritores({
      setPreferencia: (clave, valor) => updateSetting(clave, valor),
    });
  }, [updateSetting]);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Hook para leer y modificar preferencias */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider');
  return ctx;
}
