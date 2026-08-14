/**
 * emergency-card-store — la copia local de la ficha de emergencia.
 *
 * OLA6 PIEZA D. La ficha tiene que abrir SIN RED y SIN SESIÓN. Un hospital es
 * exactamente el lugar donde el teléfono no tiene señal y donde nadie sabe tu
 * contraseña. Una ficha que necesita login para leerse no es una ficha de
 * emergencia, es un formulario.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO NO VA CIFRADO. No lo "arregles".
 *
 * Esta ficha está diseñada para que la lea un EXTRAÑO: el paramédico que
 * llega, quien te levanta del piso, el de urgencias. La gente la trae en un
 * dije, en una pulsera, pegada adentro del casco. Su código QR se imprime y
 * se cuelga del cuello. Todo lo que vive aquí es, por diseño, público.
 *
 * Cifrar un dato que se imprime y se cuelga del cuello no protege nada: la
 * llave tendría que viajar con el dato o quedarse en el teléfono, y en los
 * dos casos el sobre se abre solo. Es teatro, y el teatro cuesta código,
 * cuesta fallas silenciosas y da una sensación de seguridad que no existe.
 *
 * La protección real de esta ficha es EDITORIAL, no criptográfica: aquí solo
 * entra lo que ayuda a un paramédico en dos minutos y no le sirve a un
 * tercero para hacerte daño. Ver la lista curada en emergency-card-core.
 *
 * Lo que sí es secreto (historia clínica completa, medicación completa,
 * aseguradora) NO vive aquí: vive en el expediente, detrás de sesión, y se
 * abre desde dentro de la app con el teléfono desbloqueado.
 * ─────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseCard, type EmergencyCard } from './emergency-card-core';

const BLOB_KEY = 'atp_ficha_emergencia_v1';

/** Guarda la copia local, en claro. */
export async function saveLocalCard(card: EmergencyCard): Promise<void> {
  try {
    await AsyncStorage.setItem(BLOB_KEY, JSON.stringify(card));
  } catch { /* la ficha del servidor sigue; la local se reintenta al abrir */ }
}

/**
 * Lee la copia local. null si no hay o si el JSON está roto: nunca devuelve
 * datos a medias. Una ficha incompleta frente a un paramédico miente por
 * omisión.
 */
export async function loadLocalCard(): Promise<EmergencyCard | null> {
  try {
    const blob = await AsyncStorage.getItem(BLOB_KEY);
    if (!blob) return null;
    return parseCard(JSON.parse(blob));
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
 * a tu cuenta ni a tu expediente, solo a esta ficha, y ese es todo el punto.
 * El interruptor existe para quien no la quiera, no porque lo de adentro sea
 * secreto.
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
