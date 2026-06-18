/**
 * Capa 1 — validación de archivo de lab ANTES de subir. Pura y testeable (sin Alert):
 * devuelve el veredicto y, si hace falta, un `needsConfirm` para que la UI muestre el diálogo.
 *
 * Cubre: tamaño (hard 20MB), páginas PDF (hard 50, soft-confirm 20), PDF protegido (/Encrypt),
 * imagen pesada (info >8MB). El conteo de páginas usa regex sobre el PDF (no hay pdf-lib en
 * deps); cubre ~95% de PDFs y, si no puede contar, PERMITE (mejor procesar que bloquear).
 */
export type ValidationResult =
  | { ok: true; pageCount?: number; needsConfirm?: boolean; confirmMessage?: string; info?: string }
  | { ok: false; error: string; severity: 'warn' | 'error' };

const MB = 1024 * 1024;
export const LAB_MAX_FILE_BYTES = 20 * MB;
export const LAB_MAX_PDF_PAGES = 50;
export const LAB_WARN_PDF_PAGES = 20;
export const LAB_HEAVY_IMAGE_BYTES = 8 * MB;

/** Decodifica base64 a string binario (latin1). null si falla. */
function decodeBase64(base64: string): string | null {
  try {
    return atob(base64);
  } catch {
    return null;
  }
}

/** ¿El PDF está cifrado/protegido con contraseña? Heurística por el diccionario /Encrypt. */
export function isPdfEncrypted(base64: string): boolean {
  const bin = decodeBase64(base64);
  if (!bin) return false;
  return /\/Encrypt\b/.test(bin);
}

/**
 * Cuenta páginas de un PDF desde su base64. Estrategia: el page-tree root tiene `/Count N`;
 * si no, cuenta objetos `/Type /Page`. Devuelve null si no puede determinarlo.
 */
export function countPdfPages(base64: string): number | null {
  const bin = decodeBase64(base64);
  if (!bin) return null;
  // 1) /Count N del árbol de páginas (tomar el mayor: el root tiene el total).
  let max = 0;
  const countRe = /\/Count\s+(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = countRe.exec(bin)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  if (max > 0) return max;
  // 2) Fallback: contar objetos de página individuales (/Type /Page no seguido de 's').
  const pageRe = /\/Type\s*\/Page(?![a-zA-Z])/g;
  const pages = (bin.match(pageRe) || []).length;
  return pages > 0 ? pages : null;
}

export function validateLabFile(
  base64: string,
  fileType: 'image' | 'pdf',
  fileSize: number,
): ValidationResult {
  // HARD: tamaño > 20MB.
  if (fileSize > LAB_MAX_FILE_BYTES) {
    return { ok: false, severity: 'error', error: 'Archivo muy grande (máx 20MB). Comprime tu PDF antes de subir.' };
  }

  if (fileType === 'pdf') {
    // HARD: PDF protegido con contraseña.
    if (isPdfEncrypted(base64)) {
      return { ok: false, severity: 'error', error: 'PDF protegido con contraseña. Quita la protección y vuelve a intentar.' };
    }
    const pageCount = countPdfPages(base64);
    if (pageCount != null) {
      if (pageCount > LAB_MAX_PDF_PAGES) {
        return { ok: false, severity: 'error', error: `PDF muy largo (${pageCount} páginas, máx ${LAB_MAX_PDF_PAGES}). Divide tu archivo.` };
      }
      if (pageCount > LAB_WARN_PDF_PAGES) {
        return { ok: true, pageCount, needsConfirm: true, confirmMessage: `PDF de ${pageCount} páginas. Puede tardar 1-2 minutos. ¿Continuar?` };
      }
      return { ok: true, pageCount };
    }
    // No se pudo contar → permitir (mejor procesar que bloquear).
    return { ok: true };
  }

  // Imagen pesada: permitir, solo informar.
  if (fileSize > LAB_HEAVY_IMAGE_BYTES) {
    return { ok: true, info: 'Imagen pesada — el análisis puede tardar un poco más.' };
  }
  return { ok: true };
}
