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

// === TIPOS ===

export type VoiceLanguage = 'es-MX' | 'es-ES' | 'en-US' | 'en-GB';
export type SoundStyle = 'digital' | 'boxing' | 'whistle' | 'military' | 'silent';

export interface Settings {
  voiceEnabled: boolean;
  voiceLanguage: VoiceLanguage;
  countdownSpoken: boolean;
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
