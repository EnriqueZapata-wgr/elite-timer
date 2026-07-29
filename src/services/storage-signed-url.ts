/**
 * MB-13 · PIEZA 5.3 — URLs firmadas de vida corta, regeneradas bajo demanda.
 *
 * Una URL firmada de un año sobre el PDF de un laboratorio es un enlace
 * público durante ese año: no se revoca, y si se filtra en un log, una
 * captura o un respaldo, queda expuesta. Regla nueva: en DB se guarda el
 * PATH de storage; la URL se firma al momento de usarse, con TTL corto.
 *
 * Compat: las filas viejas guardan la URL firmada completa. De ahí se
 * extrae el path y se re-firma corto. Los tokens viejos no se pueden
 * revocar; mueren en su vencimiento original.
 */
import { supabase } from '@/src/lib/supabase';

/** 10 minutos: suficiente para ver o descargar, inútil si se filtra. */
export const SHORT_SIGNED_TTL_SECONDS = 600;

/**
 * Acepta un path crudo ('userId/123.pdf') o una URL firmada vieja
 * (.../storage/v1/object/sign/<bucket>/<path>?token=...) y devuelve el path.
 */
export function storagePathFromValue(
  bucket: string,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (!value.startsWith('http')) return value;
  const marker = `/object/sign/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(value.slice(idx + marker.length).split('?')[0]);
}

/**
 * URL firmada fresca de vida corta para un path (o URL vieja) del bucket.
 * Si no se puede firmar y el valor era una URL, se devuelve esa como último
 * recurso (fail-soft: mejor un enlace viejo que un visor roto).
 */
export async function getFreshSignedUrl(
  bucket: string,
  pathOrLegacyUrl: string | null | undefined,
): Promise<string | null> {
  const path = storagePathFromValue(bucket, pathOrLegacyUrl);
  if (!path) return pathOrLegacyUrl ?? null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SHORT_SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return pathOrLegacyUrl?.startsWith('http') ? pathOrLegacyUrl : null;
  }
  return data.signedUrl;
}
