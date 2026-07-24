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

// V1.5.1 (#7): caché en memoria de signed URLs por imagen_path — misma URL
// para toda la sesión (la Audioteca y el player/lockscreen la comparten) y la
// caché de disco de expo-image no se invalida por re-firmar en cada mount.
// Margen de 1h sobre el TTL de 24h para no entregar URLs a punto de vencer.
const SIGNED_TTL_S = 86400;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** URL remota firmada de la cover, o null (sin imagen_path / error de firma). */
export async function resolveRemoteCoverUrl(piece: Pick<AudioPiece, 'imagen_path'>): Promise<string | null> {
  if (!piece.imagen_path) return null;
  const hit = signedUrlCache.get(piece.imagen_path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  try {
    const { data } = await supabase.storage
      .from('mente-audio')
      .createSignedUrl(piece.imagen_path, SIGNED_TTL_S);
    if (data?.signedUrl) {
      signedUrlCache.set(piece.imagen_path, {
        url: data.signedUrl,
        expiresAt: Date.now() + (SIGNED_TTL_S - 3600) * 1000,
      });
      return data.signedUrl;
    }
  } catch { /* fallback local */ }
  return null;
}

/**
 * Source final de la cover: remota firmada si existe imagen_path, local si no.
 * OJO (#7): para UI usa el patrón local-de-base + overlay remoto (AudioPieceCard/
 * player) — swapear el source deja blank mientras el remoto baja. Esto queda
 * para consumidores no visuales (artwork del lockscreen).
 */
export async function resolveCoverSource(piece: AudioPiece): Promise<ImageSourcePropType> {
  const url = await resolveRemoteCoverUrl(piece);
  return url ? { uri: url } : localCoverFor(piece);
}
