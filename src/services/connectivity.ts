/**
 * connectivity — detección de red fail-fast SIN dependencias nativas nuevas
 * (bug #8, pre-beta: no hay @react-native-community/netinfo ni expo-network
 * en el binario actual y no podemos meter módulos nativos sin build).
 *
 * Estrategia: GET barato al health endpoint de Supabase con timeout corto.
 * CUALQUIER respuesta HTTP (aunque sea 401) significa que hay red; solo el
 * error de fetch / timeout cuenta como offline.
 */
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL!;

export async function isOnline(timeoutMs: number = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return true; // respondió algo → hay red (el status no importa aquí)
  } catch {
    return false; // network error o timeout → offline (fail-fast)
  } finally {
    clearTimeout(timeoutId);
  }
}
