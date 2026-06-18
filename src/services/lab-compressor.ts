/**
 * Capa 4 — compresión cliente de PDFs grandes.
 *
 * ⚠️ ESTADO: la conversión real PDF→JPG requiere un RENDERER de PDF nativo (react-native-pdf,
 * pdf.js+canvas, expo-image-manipulator NO rasteriza PDFs) — NINGUNO está en deps y el sprint
 * prohíbe deps nativas nuevas. Por eso `compressLabFile` hace el GATING correcto pero cae a
 * "no comprimido" (sube el PDF original). El problema real (cap 60s + PDF grande) lo resuelve
 * el WORKER server-side + splitting (Capas 9 y 3), que NO necesita compresión cliente. Ver flag.
 */
import { warn as logWarn } from '@/src/lib/logger';

const MB = 1024 * 1024;
export const COMPRESS_THRESHOLD_BYTES = 2 * MB;

export type CompressionResult =
  | { compressed: false; reason: string; data: { base64: string; type: 'pdf' | 'image'; mimeType: string } }
  | { compressed: true; pages: Array<{ base64: string; mimeType: string }>; originalSizeBytes: number; compressedSizeBytes: number };

/** ¿El archivo debería comprimirse? Solo PDFs por encima del umbral. */
export function needsCompression(fileType: 'pdf' | 'image', fileSize: number): boolean {
  return fileType === 'pdf' && fileSize > COMPRESS_THRESHOLD_BYTES;
}

const mimeFor = (t: 'pdf' | 'image') => (t === 'pdf' ? 'application/pdf' : 'image/jpeg');

export async function compressLabFile(
  base64: string,
  fileType: 'pdf' | 'image',
  fileSize: number,
): Promise<CompressionResult> {
  if (!needsCompression(fileType, fileSize)) {
    return { compressed: false, reason: 'No requiere compresión', data: { base64, type: fileType, mimeType: mimeFor(fileType) } };
  }
  try {
    const pages = await convertPdfPagesToJpgs(base64, { quality: 0.8, maxWidth: 1600 });
    if (pages.length === 0) throw new Error('renderer no disponible');
    const compressedSizeBytes = Math.round(pages.reduce((s, p) => s + p.base64.length * 0.75, 0));
    return { compressed: true, pages, originalSizeBytes: fileSize, compressedSizeBytes };
  } catch (e) {
    logWarn('[compressor] PDF→JPG no disponible, subiendo original (el worker hace splitting):', (e as any)?.message ?? e);
    return { compressed: false, reason: 'Sin renderer PDF→JPG; fallback al PDF original (worker splitea)', data: { base64, type: 'pdf', mimeType: 'application/pdf' } };
  }
}

/**
 * Conversión PDF→JPG. Requiere renderer nativo (no en deps) → lanza para forzar el fallback.
 * Cuando se agregue un renderer (o un edge function `pdf-to-jpg`), implementar aquí.
 */
async function convertPdfPagesToJpgs(
  _base64: string,
  _opts: { quality: number; maxWidth: number },
): Promise<Array<{ base64: string; mimeType: string }>> {
  throw new Error('PDF→JPG renderer no implementado (sin dep nativa)');
}
