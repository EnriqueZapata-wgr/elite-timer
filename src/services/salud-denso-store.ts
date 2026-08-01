/**
 * salud-denso-store — el interruptor del modo denso de SALUD.
 *
 * Preferencia local del usuario: cómo quiere ver SU pantalla. No hay nada que
 * sincronizar ni que consultar en el servidor.
 *
 * Apagado por default: la versión curada es la que recibe a todo el mundo, y
 * el modo denso es la salida para quien ya sabe lo que busca.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'salud_modo_denso_v1';

/** Evento para que el hub reaccione al toggle sin volver a montar. */
export const SALUD_DENSO_EVENT = 'salud_denso_changed';

export async function loadModoDenso(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveModoDenso(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* sin persistencia: vuelve al modo curado en el próximo arranque */
  }
}
