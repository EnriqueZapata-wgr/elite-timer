/**
 * fitzpatrick-service — lectura/escritura del fototipo en profiles.skin_type.
 * Misma columna que ATP SOL (app/solar.tsx) y la card UV del HOY. Quien escriba
 * debe emitir DeviceEventEmitter.emit('fototipo_changed') para refrescar el HOY.
 */
import { supabase } from '@/src/lib/supabase';

/** Fototipo 1-6 del perfil, o null si no hay valor válido. */
export async function fetchSkinType(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('profiles')
    .select('skin_type')
    .eq('id', userId)
    .maybeSingle();
  const t = data?.skin_type;
  return typeof t === 'number' && t >= 1 && t <= 6 ? t : null;
}

/** Guarda el fototipo (1-6) en el perfil. Lanza si el update falla. */
export async function saveSkinType(userId: string, skinType: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ skin_type: skinType })
    .eq('id', userId);
  if (error) throw new Error(error.message || JSON.stringify(error));
}
