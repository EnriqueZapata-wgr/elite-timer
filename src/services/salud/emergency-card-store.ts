/**
 * emergency-card-store — la copia local de la ficha de emergencia.
 *
 * OLA6 PIEZA D, y es la pieza que justifica todo lo demás: la ficha tiene que
 * abrir SIN RED y SIN SESIÓN. Un hospital es exactamente el lugar donde el
 * teléfono no tiene señal y donde nadie sabe tu contraseña. Una ficha que
 * necesita login para leerse no es una ficha de emergencia, es un formulario.
 *
 * Cómo:
 *   · La llave (32 bytes) vive en el LLAVERO del sistema operativo
 *     (expo-secure-store → Keychain en iOS, Keystore en Android). Esa es la
 *     frontera real: se abre con el desbloqueo del teléfono, no con la sesión
 *     de ATP.
 *   · El criptograma vive en AsyncStorage. Quien saque un respaldo del
 *     teléfono no se lleva alergias ni medicación en claro.
 *   · Cifrado y autenticado con local-crypto-core (ChaCha20 + HMAC-SHA256,
 *     verificados contra los vectores de la norma).
 *
 * ⚠️ expo-secure-store es módulo NATIVO: el require va lazy dentro del
 * try/catch, nunca a nivel de módulo (lección del crash 'ExpoPrint'). Si no
 * está (web, binario viejo por OTA), la llave cae a AsyncStorage: el sobre
 * sigue cifrado, pero la llave deja de estar en el llavero. Se degrada, no
 * se rompe, y la ficha sigue abriendo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sealLocal, openLocal, randomKeyHex } from './local-crypto-core';
import { parseCard, type EmergencyCard } from './emergency-card-core';

const BLOB_KEY = 'atp_ficha_emergencia_v1';
const KEY_KEY = 'atp_ficha_emergencia_key_v1';

let SecureStore: any = null;
try { SecureStore = require('expo-secure-store'); } catch { /* sin llavero: cae a AsyncStorage */ }

async function readKey(): Promise<string | null> {
  try {
    if (SecureStore?.getItemAsync) {
      const k = await SecureStore.getItemAsync(KEY_KEY);
      if (k) return k;
    }
  } catch { /* llavero bloqueado o no disponible */ }
  try {
    return await AsyncStorage.getItem(KEY_KEY);
  } catch {
    return null;
  }
}

async function writeKey(key: string): Promise<void> {
  try {
    if (SecureStore?.setItemAsync) {
      // WHEN_UNLOCKED_THIS_DEVICE_ONLY: se lee con el teléfono desbloqueado y
      // NO viaja en el respaldo de iCloud. Es una ficha médica, no una
      // preferencia: no tiene por qué salir de este aparato.
      await SecureStore.setItemAsync(KEY_KEY, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }
  } catch { /* cae abajo */ }
  try { await AsyncStorage.setItem(KEY_KEY, key); } catch { /* sin persistencia */ }
}

/** La llave de este teléfono. Se crea la primera vez y no cambia. */
async function ensureKey(): Promise<string> {
  const existing = await readKey();
  if (existing && existing.length === 64) return existing;
  const fresh = randomKeyHex();
  await writeKey(fresh);
  return fresh;
}

/** Guarda la copia local cifrada. */
export async function saveLocalCard(card: EmergencyCard): Promise<void> {
  try {
    const key = await ensureKey();
    await AsyncStorage.setItem(BLOB_KEY, sealLocal(key, JSON.stringify(card)));
  } catch { /* la ficha del servidor sigue; la local se reintenta al abrir */ }
}

/**
 * Lee la copia local. null si no hay, si la llave se perdió o si el sobre está
 * corrupto: nunca devuelve datos a medias. Una ficha incompleta frente a un
 * paramédico miente por omisión.
 */
export async function loadLocalCard(): Promise<EmergencyCard | null> {
  try {
    const blob = await AsyncStorage.getItem(BLOB_KEY);
    if (!blob) return null;
    const key = await readKey();
    if (!key) return null;
    const plain = openLocal(key, blob);
    if (!plain) return null;
    return parseCard(JSON.parse(plain));
  } catch {
    return null;
  }
}

/** Borra la copia local (cerrar sesión, apagar el acceso previo). */
export async function clearLocalCard(): Promise<void> {
  try { await AsyncStorage.removeItem(BLOB_KEY); } catch { /* */ }
}

/** ¿Hay copia local guardada? Sin descifrarla: para pintar o no la entrada. */
export async function hasLocalCard(): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(BLOB_KEY));
  } catch {
    return false;
  }
}

// ─── El interruptor de Ajustes ──────────────────────────────────────────────

const PRELOGIN_KEY = 'atp_ficha_prelogin_v1';

/**
 * ¿La ficha se puede abrir antes de iniciar sesión? ENCENDIDO por default:
 * decisión del fundador. Quien te encuentre inconsciente no va a poder entrar
 * a tu cuenta, y ese es todo el punto. La protección que queda es la del
 * sistema operativo, que es la que tiene sentido aquí.
 */
export async function loadFichaPrelogin(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PRELOGIN_KEY);
    return v == null ? true : v === '1';
  } catch {
    return true;
  }
}

export async function saveFichaPrelogin(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PRELOGIN_KEY, on ? '1' : '0');
    // Apagarlo no deja el sobre olvidado en el disco.
    if (!on) await clearLocalCard();
  } catch { /* */ }
}
