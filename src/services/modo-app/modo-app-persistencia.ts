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
import { esModoApp, esPreferenciaModo, type ModoApp, type PreferenciaModo } from './modo-app-core';

const LLAVE_ULTIMO = 'atp_modo_app_ultimo_v1';
const LLAVE_PREFERENCIA = 'atp_modo_app_preferencia_v1';

export async function leerModoGuardado(): Promise<{ ultimo: ModoApp | null; preferencia: PreferenciaModo }> {
  try {
    const [u, p] = await Promise.all([AsyncStorage.getItem(LLAVE_ULTIMO), AsyncStorage.getItem(LLAVE_PREFERENCIA)]);
    return { ultimo: esModoApp(u) ? u : null, preferencia: esPreferenciaModo(p) ? p : 'auto' };
  } catch {
    return { ultimo: null, preferencia: 'auto' };
  }
}

export async function guardarUltimoModo(m: ModoApp): Promise<void> {
  try { await AsyncStorage.setItem(LLAVE_ULTIMO, m); } catch { /* sin disco: solo no se recuerda */ }
}

export async function guardarPreferenciaModo(p: PreferenciaModo): Promise<void> {
  try { await AsyncStorage.setItem(LLAVE_PREFERENCIA, p); } catch { /* idem */ }
}
