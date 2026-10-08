/**
 * modo-app-persistencia (26-sep-2026): lo que el telefono recuerda del modo.
 *  - El ultimo modo conocido: al abrir la app en frio (sin red, o antes de
 *    que el nivel se lea) se pinta la version que la persona ya conoce, sin
 *    parpadear a la otra.
 *  - La preferencia del admin (Ajustes). Es del telefono, no de la cuenta:
 *    es una herramienta de Enrique para ver las dos versiones.
 * Un fallo de AsyncStorage no rompe nada: se queda lo de por defecto.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  esModoApp,
  esPreferenciaModo,
  esPreferenciaPresentacion,
  type ModoApp,
  type PreferenciaModo,
  type PreferenciaPresentacion,
} from './modo-app-core';

const LLAVE_ULTIMO = 'atp_modo_app_ultimo_v1';
const LLAVE_PREFERENCIA = 'atp_modo_app_preferencia_v1';
// 8-oct-2026 (v4): la presentacion que escogio el admin (clasica o v4).
// Tambien es del telefono, no de la cuenta.
export const LLAVE_PRESENTACION = 'atp_presentacion_pref_v1';

export interface ModoGuardado {
  ultimo: ModoApp | null;
  preferencia: PreferenciaModo;
  /** 8-oct-2026 (v4): en la misma lectura, para no pintar la barra clasica y
   *  luego la v4 en el arranque en frio del admin. */
  presentacion: PreferenciaPresentacion;
}

export async function leerModoGuardado(): Promise<ModoGuardado> {
  try {
    const [u, p, pr] = await Promise.all([
      AsyncStorage.getItem(LLAVE_ULTIMO),
      AsyncStorage.getItem(LLAVE_PREFERENCIA),
      AsyncStorage.getItem(LLAVE_PRESENTACION),
    ]);
    return {
      ultimo: esModoApp(u) ? u : null,
      preferencia: esPreferenciaModo(p) ? p : 'auto',
      presentacion: esPreferenciaPresentacion(pr) ? pr : 'auto',
    };
  } catch {
    return { ultimo: null, preferencia: 'auto', presentacion: 'auto' };
  }
}

export async function guardarUltimoModo(m: ModoApp): Promise<void> {
  try { await AsyncStorage.setItem(LLAVE_ULTIMO, m); } catch { /* sin disco: solo no se recuerda */ }
}

export async function guardarPreferenciaModo(p: PreferenciaModo): Promise<void> {
  try { await AsyncStorage.setItem(LLAVE_PREFERENCIA, p); } catch { /* idem */ }
}

/**
 * 8-oct-2026 (v4): la presentacion guardada. Un valor corrupto o un fallo de
 * disco se leen como 'auto' (la regla por cuenta decide).
 */
export async function leerPresentacionGuardada(): Promise<PreferenciaPresentacion> {
  try {
    const v = await AsyncStorage.getItem(LLAVE_PRESENTACION);
    return esPreferenciaPresentacion(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function guardarPreferenciaPresentacion(p: PreferenciaPresentacion): Promise<void> {
  try { await AsyncStorage.setItem(LLAVE_PRESENTACION, p); } catch { /* idem */ }
}
