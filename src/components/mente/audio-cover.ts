/**
 * Sprint Audio Mente — covers de las piezas de audio.
 *
 * Las portadas MJ del batch 1 aún no existen (imagen_path NULL en el seed):
 * fallback editorial LOCAL por categoría (assets ya en el bundle, cero red).
 * Cuando las covers se suban al bucket (covers/<slug>.png) y se llene
 * imagen_path, resolveRemoteCoverUrl preferirá la remota (signed por el
 * cliente: la policy de storage permite leer covers/* a cualquier autenticado).
 *
 * V1.5.2 (#3) — fix RAÍZ del parpadeo entre sesiones: la URL firmada ahora es
 * ESTABLE entre sesiones — TTL 30 días + caché PERSISTENTE (AsyncStorage), no
 * solo memoria. expo-image cachea el binario por URI: si la URI no cambia al
 * reabrir la app, el disco pega y no hay re-descarga ni swap. Re-firmamos solo
 * cuando quedan <48h de vida. (El bucket 'mente-audio' es PRIVADO y comparte
 * espacio con los m4a premium — hacerlo público NO es opción sin coordinar
 * storage con Cowork; la firma persistente logra el mismo efecto OTA-able.)
 * Además: prefetchAudioCovers() calienta el caché de disco al montar las
 * pantallas (mata también el primer swap de por vida).
 */
import type { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
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

// V1.5.2 (#3): TTL 30 días + persistencia. La firma es un JWT con exp — 30 días
// es válido para createSignedUrl y mantiene la URI idéntica entre sesiones.
const SIGNED_TTL_S = 30 * 86400;
/** Re-firmar cuando queden <48h (colchón para uso offline prolongado). */
const RESIGN_MARGIN_MS = 48 * 3600 * 1000;
const STORAGE_KEY = 'mente_cover_signed_urls_v1';

interface CachedUrl { url: string; expiresAt: number }
const signedUrlCache = new Map<string, CachedUrl>();

// Hidratación única desde AsyncStorage (lazy, compartida por todos los callers).
let hydrated: Promise<void> | null = null;
function hydrateCache(): Promise<void> {
  if (!hydrated) {
    hydrated = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, CachedUrl>;
        for (const [path, entry] of Object.entries(parsed)) {
          if (entry?.url && typeof entry.expiresAt === 'number') {
            signedUrlCache.set(path, entry);
          }
        }
      })
      .catch(() => { /* caché frío: se re-firma */ });
  }
  return hydrated;
}

/** Write-through a AsyncStorage (fire-and-forget; el Map es la verdad viva). */
function persistCache(): void {
  const obj: Record<string, CachedUrl> = {};
  for (const [k, v] of signedUrlCache) obj[k] = v;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj)).catch(() => {});
}

/** URL remota firmada de la cover, o null (sin imagen_path / error de firma). */
export async function resolveRemoteCoverUrl(piece: Pick<AudioPiece, 'imagen_path'>): Promise<string | null> {
  if (!piece.imagen_path) return null;
  await hydrateCache();
  const hit = signedUrlCache.get(piece.imagen_path);
  if (hit && hit.expiresAt - RESIGN_MARGIN_MS > Date.now()) return hit.url;
  try {
    const { data } = await supabase.storage
      .from('mente-audio')
      .createSignedUrl(piece.imagen_path, SIGNED_TTL_S);
    if (data?.signedUrl) {
      signedUrlCache.set(piece.imagen_path, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_TTL_S * 1000,
      });
      persistCache();
      return data.signedUrl;
    }
  } catch { /* fallback local */ }
  // Firma falló (offline): una URL cacheada aún no-expirada sigue sirviendo.
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  return null;
}

/**
 * V1.5.2 (#3): prefetch de covers al montar hub/audioteca — resuelve las URLs
 * (calienta también el caché de firmas) y baja los binarios al disco de
 * expo-image ANTES de que las cards monten → mata el primer swap de por vida.
 * Fire-and-forget: los errores individuales no bloquean nada.
 */
export async function prefetchAudioCovers(pieces: readonly Pick<AudioPiece, 'imagen_path'>[]): Promise<void> {
  try {
    const urls = (await Promise.all(
      pieces.filter((p) => p.imagen_path).map((p) => resolveRemoteCoverUrl(p).catch(() => null)),
    )).filter((u): u is string => !!u);
    if (urls.length > 0) await ExpoImage.prefetch(urls, 'disk');
  } catch { /* best-effort */ }
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
