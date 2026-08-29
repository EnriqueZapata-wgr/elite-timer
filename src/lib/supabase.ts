/**
 * Cliente Supabase — Configuración centralizada para auth y queries.
 *
 * En móvil usa expo-secure-store (encriptado) para persistir tokens.
 * En web usa localStorage directo (AsyncStorage crashea por SSR: window is not defined).
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Adapter según plataforma: SecureStore en móvil, localStorage en web
let storageAdapter: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

if (Platform.OS === 'web') {
  // localStorage con guard para SSR (window puede no existir durante el bundle)
  storageAdapter = {
    getItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    setItem: async (key: string, value: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    },
  };
} else {
  const SecureStore = require('expo-secure-store');

  // ATP-MOBILE-N (Sentry): "Calling the 'getValueWithKeyAsync' function has
  // failed -> User interaction is not allowed."
  //
  // El llavero de iOS, por DEFAULT, solo deja leer un item con el telefono
  // DESBLOQUEADO (kSecAttrAccessibleWhenUnlocked). Cuando la app despierta en
  // segundo plano con la pantalla bloqueada (una notificacion, un refresh de
  // token) la lectura de la sesion truena, y sale como promesa no manejada.
  // Coincide con la evidencia: cuatro eventos, dos personas, iOS, y los dos
  // con `in_foreground: false`.
  //
  // AFTER_FIRST_UNLOCK deja leerlo desde el primer desbloqueo tras encender
  // el telefono, aunque la pantalla este bloqueada. NO baja la seguridad de
  // forma relevante: el item sigue sin salir del dispositivo y sigue sin
  // viajar a otro telefono en un backup.
  //
  // OJO, y esto importa para medir si sirvio: la accesibilidad se graba JUNTO
  // con el item, asi que las sesiones ya guardadas conservan la vieja hasta
  // que se REESCRIBEN, o sea hasta el proximo refresh de token. El arreglo no
  // es retroactivo y no se ve el mismo dia.
  const LLAVERO = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

  storageAdapter = {
    getItem: (key: string) => SecureStore.getItemAsync(key, LLAVERO),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, LLAVERO),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key, LLAVERO),
  };
}

// En desarrollo: process.env. En build EAS: Constants.expoConfig.extra.
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'atp-mobile/1.0.0',
    },
  },
});
