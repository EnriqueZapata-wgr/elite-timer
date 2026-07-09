/**
 * ARGOS Intro Service — flag de primer contacto (T6 Sprint MAGIA ARGOS).
 *
 * profiles.argos_introduced_at (migración 163): timestamp de cuándo el usuario
 * vio "Meet ARGOS". Hasta entonces el floating button de ARGOS no aparece.
 */
import { supabase } from '@/src/lib/supabase';
import { error as logError } from '@/src/lib/logger';

/** ¿El usuario ya conoció a ARGOS? Fail-open a false (mejor no presentar de más). */
export async function hasArgosBeenIntroduced(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('argos_introduced_at')
      .eq('id', userId)
      .single();
    return !!data?.argos_introduced_at;
  } catch (e) {
    logError('[ARGOS] hasArgosBeenIntroduced failed:', e);
    return false;
  }
}

/**
 * Marca la intro como vista (solo si aún no lo estaba, para preservar el
 * timestamp del PRIMER contacto). Retorna true si quedó marcada.
 */
export async function markArgosIntroduced(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ argos_introduced_at: new Date().toISOString() })
      .eq('id', userId)
      .is('argos_introduced_at', null);
    if (error) {
      logError('[ARGOS] markArgosIntroduced failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    logError('[ARGOS] markArgosIntroduced threw:', e);
    return false;
  }
}
