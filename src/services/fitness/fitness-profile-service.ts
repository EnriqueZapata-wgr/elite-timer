/**
 * Fitness Profile service (MB-3.6 Bloque 1.3) — nivel del usuario en el PERFIL.
 *
 * Fuente de verdad: profiles.fitness_level (migración 224). AsyncStorage queda
 * SOLO como caché offline (antes era la única persistencia, dentro de las prefs
 * del generador). Fail-soft: si la red truena o la columna aún no existe en el
 * remoto, se responde desde caché sin romper el flujo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';

const CACHE_KEY = 'fitness_level_cache_v1';

function esNivel(v: unknown): v is NivelUsuario {
  return typeof v === 'string' && (NIVELES_USUARIO as readonly string[]).includes(v);
}

/**
 * Nivel del usuario desde el perfil; null = nunca lo ha declarado (dispara el
 * primer-uso de Fitness). Con red caída responde desde la caché local.
 */
export async function getFitnessLevel(userId: string): Promise<NivelUsuario | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('fitness_level')
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      const nivel = (data as { fitness_level?: string | null } | null)?.fitness_level ?? null;
      if (esNivel(nivel)) {
        AsyncStorage.setItem(CACHE_KEY, nivel).catch(() => {});
        return nivel;
      }
      return null;
    }
  } catch { /* red caída → caché */ }
  const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  return esNivel(cached) ? cached : null;
}

/**
 * 20-sep-2026: la misma lectura, pero DICIENDO si falló. getFitnessLevel
 * confunde "no se pudo leer y no hay caché" con "nunca lo declaró" (los dos
 * son null); una pantalla que pinta el nivel como titular necesita
 * distinguirlos para no decir SIN DECLARAR a quien sí lo declaró.
 */
export async function leerNivelDeclarado(userId: string): Promise<{ nivel: NivelUsuario | null; fallo: boolean }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('fitness_level')
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      const nivel = (data as { fitness_level?: string | null } | null)?.fitness_level ?? null;
      if (esNivel(nivel)) {
        AsyncStorage.setItem(CACHE_KEY, nivel).catch(() => {});
        return { nivel, fallo: false };
      }
      return { nivel: null, fallo: false };
    }
    logWarn('[fitness-profile] leerNivelDeclarado failed:', error.message);
  } catch (e) {
    logWarn('[fitness-profile] leerNivelDeclarado threw:', e);
  }
  const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  if (esNivel(cached)) return { nivel: cached, fallo: false };
  return { nivel: null, fallo: true };
}

/**
 * Persiste el nivel en el perfil y DICE si quedó guardado.
 * A7 (20-sep-2026): antes escribía la caché antes de la red y se tragaba el
 * error; la pantalla decía "Declarado por ti" con un nivel que no se guardó.
 * La caché se escribe SOLO cuando la red respondió ok; con {ok:false} nada
 * cambió (ni perfil ni caché) y la pantalla debe decirlo sin mover lo pintado.
 */
export async function setFitnessLevel(userId: string, nivel: NivelUsuario): Promise<{ ok: boolean }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ fitness_level: nivel })
      .eq('id', userId);
    if (error) {
      logWarn('[fitness-profile] setFitnessLevel failed:', error.message);
      return { ok: false };
    }
  } catch (e) {
    logWarn('[fitness-profile] setFitnessLevel threw:', e);
    return { ok: false };
  }
  AsyncStorage.setItem(CACHE_KEY, nivel).catch(() => {});
  return { ok: true };
}
