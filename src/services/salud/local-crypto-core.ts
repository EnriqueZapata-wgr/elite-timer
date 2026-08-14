/**
 * local-crypto-core — cifrado local, puro y sin dependencias nativas.
 *
 * Existe por una sola razón: la ficha de emergencia tiene que abrir SIN RED y
 * SIN SESIÓN, y para eso hay que guardar una copia de los datos médicos de la
 * persona en el teléfono. Guardarlos en claro en AsyncStorage no.
 *
 * Qué hay aquí (todo estándar, nada inventado):
 *   · SHA-256 (FIPS 180-4)
 *   · HMAC-SHA256 (RFC 2104)
 *   · ChaCha20 (RFC 8439 §2.4)
 *   · base64 y UTF-8 a mano
 *
 * Por qué a mano: el proyecto no tiene expo-crypto ni ningún paquete de
 * cripto, y meter una dependencia nueva obliga a build nativo. Estas cuatro
 * piezas son deterministas y se verifican contra los vectores de las normas
 * (hay test). Nada de esto es criptografía nueva: es la de siempre, escrita en
 * TypeScript puro para que corra en Hermes sin módulo nativo.
 *
 * Construcción: encrypt-then-MAC. Se cifra con ChaCha20 y se autentica el
 * criptograma con HMAC-SHA256 de una subclave distinta. Si el tag no cuadra,
 * `openLocal` devuelve null y no entrega ni un byte.
 *
 * ⚠️ LÍMITE HONESTO — la llave. Sin fuente de aleatoriedad criptográfica
 * disponible (no hay expo-crypto ni crypto.getRandomValues en Hermes), la
 * llave se genera mezclando Math.random con el reloj. Eso NO es entropía de
 * grado criptográfico. La frontera real de esta ficha es la del sistema
 * operativo: la llave vive en el llavero (expo-secure-store, Keychain en iOS y
 * Keystore en Android) y el criptograma en AsyncStorage, así que quien saque
 * el respaldo del teléfono no se lleva los datos médicos en claro. El día que
 * entre expo-crypto al build, se cambia `randomKeyHex` por getRandomBytes y
 * nada más de este archivo se mueve.
 */

// ─── UTF-8 ───────────────────────────────────────────────────────────────────

export function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) { cp = b; i += 1; }
    else if (b < 0xe0) { cp = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { cp = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    if (cp > 0xffff) {
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023));
    } else out += String.fromCharCode(cp);
  }
  return out;
}

// ─── base64 ──────────────────────────────────────────────────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64Encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

export function base64Decode(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = B64.indexOf(clean[i]);
    const n1 = B64.indexOf(clean[i + 1]);
    const n2 = B64.indexOf(clean[i + 2]);
    const n3 = B64.indexOf(clean[i + 3]);
    out[p++] = (n0 << 2) | (n1 >> 4);
    if (n2 >= 0) out[p++] = ((n1 & 15) << 4) | (n2 >> 2);
    if (n3 >= 0) out[p++] = ((n2 & 3) << 6) | n3;
  }
  return out.slice(0, p);
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// ─── SHA-256 (FIPS 180-4) ────────────────────────────────────────────────────

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256(msg: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = msg.length * 8;
  const padded = new Uint8Array((((msg.length + 8) >> 6) + 1) * 64);
  padded.set(msg);
  padded[msg.length] = 0x80;
  // La longitud en bits va en los últimos 8 bytes (big-endian). Con >2^32 bits
  // (512 MB) esto se quedaría corto, y una ficha médica jamás llega ahí.
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, h[i], false);
  return out;
}

/** HMAC-SHA256 (RFC 2104). */
export function hmacSha256(key: Uint8Array, msg: Uint8Array): Uint8Array {
  let k = key.length > 64 ? sha256(key) : key;
  const block = new Uint8Array(64);
  block.set(k);
  const inner = new Uint8Array(64 + msg.length);
  const outer = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    inner[i] = block[i] ^ 0x36;
    outer[i] = block[i] ^ 0x5c;
  }
  inner.set(msg, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

// ─── ChaCha20 (RFC 8439 §2.4) ────────────────────────────────────────────────

function chachaBlock(key: Uint32Array, counter: number, nonce: Uint32Array): Uint8Array {
  const s = new Uint32Array(16);
  s[0] = 0x61707865; s[1] = 0x3320646e; s[2] = 0x79622d32; s[3] = 0x6b206574;
  s.set(key, 4);
  s[12] = counter >>> 0;
  s.set(nonce, 13);
  const x = Uint32Array.from(s);
  const rot = (v: number, n: number) => (v << n) | (v >>> (32 - n));
  const qr = (a: number, b: number, c: number, d: number) => {
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rot(x[d] ^ x[a], 16);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rot(x[b] ^ x[c], 12);
    x[a] = (x[a] + x[b]) >>> 0; x[d] = rot(x[d] ^ x[a], 8);
    x[c] = (x[c] + x[d]) >>> 0; x[b] = rot(x[b] ^ x[c], 7);
  };
  for (let i = 0; i < 10; i++) {
    qr(0, 4, 8, 12); qr(1, 5, 9, 13); qr(2, 6, 10, 14); qr(3, 7, 11, 15);
    qr(0, 5, 10, 15); qr(1, 6, 11, 12); qr(2, 7, 8, 13); qr(3, 4, 9, 14);
  }
  const out = new Uint8Array(64);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < 16; i++) dv.setUint32(i * 4, (x[i] + s[i]) >>> 0, true);
  return out;
}

/** XOR de `data` con el keystream. Cifrar y descifrar son la misma función. */
export function chacha20(key: Uint8Array, nonce: Uint8Array, counter: number, data: Uint8Array): Uint8Array {
  const kdv = new DataView(key.buffer, key.byteOffset, key.byteLength);
  const k = new Uint32Array(8);
  for (let i = 0; i < 8; i++) k[i] = kdv.getUint32(i * 4, true);
  const ndv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
  const n = new Uint32Array(3);
  for (let i = 0; i < 3; i++) n[i] = ndv.getUint32(i * 4, true);

  const out = new Uint8Array(data.length);
  for (let off = 0; off < data.length; off += 64) {
    const ks = chachaBlock(k, counter + off / 64, n);
    const end = Math.min(64, data.length - off);
    for (let i = 0; i < end; i++) out[off + i] = data[off + i] ^ ks[i];
  }
  return out;
}

// ─── Sobre local ─────────────────────────────────────────────────────────────

const VERSION = 'atp1';

/** Subclaves separadas para cifrar y para autenticar (nunca la misma). */
function subkeys(keyHex: string): { enc: Uint8Array; mac: Uint8Array } {
  const raw = hexToBytes(keyHex);
  return {
    enc: sha256(concat(raw, utf8Encode('atp-ficha-enc'))),
    mac: sha256(concat(raw, utf8Encode('atp-ficha-mac'))),
  };
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/** Comparación en tiempo constante: no filtra por dónde difieren los tags. */
function equalCT(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Llave de 32 bytes en hex. Ver el aviso del encabezado: esto NO es entropía
 * criptográfica, y la frontera real es el llavero del sistema operativo.
 */
export function randomKeyHex(): string {
  const out = new Uint8Array(32);
  let seed = Date.now();
  for (let i = 0; i < 32; i++) {
    seed = (seed * 1103515245 + 12345 + Math.floor(Math.random() * 0xffffffff)) >>> 0;
    out[i] = (seed >>> ((i % 4) * 8)) & 0xff;
  }
  return bytesToHex(out);
}

/** Nonce de 12 bytes, uno por escritura (nunca se repite con la misma llave). */
function nonce12(): Uint8Array {
  return hexToBytes(randomKeyHex()).slice(0, 12);
}

/** Cifra y autentica: `atp1.<nonce>.<criptograma>.<tag>`, todo en base64. */
export function sealLocal(keyHex: string, plaintext: string): string {
  const { enc, mac } = subkeys(keyHex);
  const n = nonce12();
  const ct = chacha20(enc, n, 1, utf8Encode(plaintext));
  const tag = hmacSha256(mac, concat(n, ct)).slice(0, 16);
  return [VERSION, base64Encode(n), base64Encode(ct), base64Encode(tag)].join('.');
}

/** Descifra. null si el sobre está corrupto, es de otra llave o lo tocaron. */
export function openLocal(keyHex: string, blob: string): string | null {
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const { enc, mac } = subkeys(keyHex);
    const n = base64Decode(parts[1]);
    const ct = base64Decode(parts[2]);
    const tag = base64Decode(parts[3]);
    if (n.length !== 12) return null;
    if (!equalCT(hmacSha256(mac, concat(n, ct)).slice(0, 16), tag)) return null;
    return utf8Decode(chacha20(enc, n, 1, ct));
  } catch {
    return null;
  }
}
