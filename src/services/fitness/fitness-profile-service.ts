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

/** Persiste el nivel en el perfil (y en caché, optimista — la UI no espera red). */
export async function setFitnessLevel(userId: string, nivel: NivelUsuario): Promise<void> {
  AsyncStorage.setItem(CACHE_KEY, nivel).catch(() => {});
  const { error } = await supabase
    .from('profiles')
    .update({ fitness_level: nivel })
    .eq('id', userId);
  if (error) logWarn('[fitness-profile] setFitnessLevel failed:', error.message);
}
