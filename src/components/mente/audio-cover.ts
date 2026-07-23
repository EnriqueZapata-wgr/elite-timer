/**
 * Sprint Audio Mente — covers de las piezas de audio.
 *
 * Las portadas MJ del batch 1 aún no existen (imagen_path NULL en el seed):
 * fallback editorial LOCAL por categoría (assets ya en el bundle, cero red).
 * Cuando las covers se suban al bucket (covers/<slug>.png) y se llene
 * imagen_path, resolveCoverSource preferirá la remota (signed por el cliente:
 * la policy de storage permite leer covers/* a cualquier autenticado).
 */
import type { ImageSourcePropType } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import type { AudioPiece } from '@/src/services/mente-audio-service';

const MEDITACION_COVERS = [
  require('@/assets/images/agenda/meditacion/meditacion-01.png'),
  require('@/assets/images/agenda/meditacion/meditacion-02.png'),
  require('@/assets/images/agenda/meditacion/meditacion-03.png'),
];
const DESCANSO_COVERS = [
  require('@/assets/images/agenda/sleep/sleep-01.png'),
  require('@/assets/images/agenda/sleep/sleep-02.png'),
];
const RESPIRACION_COVER = require('@/assets/images/intervenciones/respiracion.jpg');

/** Fallback local determinístico (misma pieza → misma imagen). */
export function localCoverFor(piece: Pick<AudioPiece, 'categoria' | 'orden'>): ImageSourcePropType {
  if (piece.categoria === 'respiracion') return RESPIRACION_COVER;
  if (piece.categoria === 'descanso') return DESCANSO_COVERS[piece.orden % DESCANSO_COVERS.length];
  return MEDITACION_COVERS[piece.orden % MEDITACION_COVERS.length];
}

/**
 * Source final de la cover: remota firmada si existe imagen_path, local si no.
 * TTL 24h — las covers no son el activo caro (el gate real es el audio).
 */
export async function resolveCoverSource(piece: AudioPiece): Promise<ImageSourcePropType> {
  if (piece.imagen_path) {
    try {
      const { data } = await supabase.storage
        .from('mente-audio')
        .createSignedUrl(piece.imagen_path, 86400);
      if (data?.signedUrl) return { uri: data.signedUrl };
    } catch { /* fallback local */ }
  }
  return localCoverFor(piece);
}
