/**
 * Qué piezas del tutorial ya vio esta persona.
 *
 * UNA LLAVE POR PIEZA, nunca una lista. Una lista se sobrescribe entera y un
 * error de escritura borra el avance completo; con llaves sueltas, lo peor que
 * pasa es que una pieza se repita una vez. La marca es dato del usuario: solo
 * la borra él, desde el centro de ayuda.
 *
 * Todo falla en silencio y hacia el lado seguro: si el disco no responde,
 * `cargarVistos` devuelve vacío (la pieza puede reaparecer, que es molesto
 * pero inofensivo) y `marcar` no truena la pantalla.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TOURS_POR_PANTALLA,
  llaveTour,
} from '@/src/components/tour/tours-por-pantalla';

/** El usuario pidió que ya no aparezcan solas. Vale para todas. */
export const LLAVE_SILENCIO = '@atp/tour_pantalla_silencio';

export async function cargarVistos(): Promise<Set<string>> {
  try {
    const llaves = TOURS_POR_PANTALLA.map((t) => llaveTour(t.id));
    const filas = await AsyncStorage.multiGet(llaves);
    const vistos = new Set<string>();
    filas.forEach(([llave, valor], i) => {
      if (valor === 'true') vistos.add(TOURS_POR_PANTALLA[i].id);
      void llave;
    });
    return vistos;
  } catch {
    return new Set<string>();
  }
}

export async function marcarVisto(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(llaveTour(id), 'true');
  } catch {
    // Que no se haya podido guardar no es motivo para tirar la pantalla.
  }
}

/** Repetir una pieza desde el centro de ayuda. */
export async function olvidarVisto(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(llaveTour(id));
  } catch {
    // igual que arriba
  }
}

/** Empezar el tutorial de cero. Solo se llama desde el centro de ayuda. */
export async function olvidarTodos(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(TOURS_POR_PANTALLA.map((t) => llaveTour(t.id)));
  } catch {
    // igual que arriba
  }
}

export async function cargarSilencio(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LLAVE_SILENCIO)) === 'true';
  } catch {
    return false;
  }
}

export async function guardarSilencio(silencio: boolean): Promise<void> {
  try {
    if (silencio) await AsyncStorage.setItem(LLAVE_SILENCIO, 'true');
    else await AsyncStorage.removeItem(LLAVE_SILENCIO);
  } catch {
    // igual que arriba
  }
}
