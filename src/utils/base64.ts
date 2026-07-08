/**
 * base64 → bytes sin dependencias nativas ni atob (Hermes no lo garantiza).
 * Uso principal: subir imágenes a Supabase Storage como ArrayBuffer — en RN
 * el upload con Blob de fetch(file://) falla con "Network request failed".
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const LOOKUP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET[i]] = i;

/** Decodifica base64 estándar (con o sin padding). Lanza si hay chars inválidos. */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Tolerante a whitespace/newlines (algunos encoders los insertan)
  const clean = base64.replace(/[\s\r\n]/g, '');
  const unpadded = clean.replace(/=+$/, '');
  const byteLength = Math.floor((unpadded.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let buffer = 0;
  let bitsCollected = 0;
  let outIndex = 0;
  for (let i = 0; i < unpadded.length; i++) {
    const value = LOOKUP[unpadded[i]];
    if (value === undefined) {
      throw new Error(`base64 inválido: caracter '${unpadded[i]}' en posición ${i}`);
    }
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes[outIndex++] = (buffer >> bitsCollected) & 0xff;
    }
  }
  return bytes;
}
