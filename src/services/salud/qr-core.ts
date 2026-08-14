/**
 * qr-core — generador de códigos QR, puro y sin dependencias.
 *
 * OLA6 PIEZA D. En el QR de la ficha va la FICHA, no un link. Un link es
 * inútil exactamente donde hace falta: sin red no abre, y en urgencias no hay
 * red. Por eso el payload va embebido y por eso hubo que generar el código
 * dentro de la app, sin servicio externo y sin paquete nuevo (que obligaría a
 * build nativo).
 *
 * Alcance deliberado: modo BYTE, nivel de corrección M, versiones 1 a 40. Sin
 * modo numérico ni alfanumérico, que solo servirían para apretar un payload
 * que ya cabe. M y no L porque esto se imprime, se fotocopia y se fotografía
 * de una pantalla con reflejos: vale la pena pagar redundancia.
 *
 * Las tablas de bloques y de patrones de alineación son las de la norma
 * (ISO/IEC 18004). El resultado se verifica módulo a módulo contra un
 * generador de referencia; hay test.
 *
 * Puro: sin react-native. Devuelve una matriz de booleanos y quien la pinte
 * decide con qué.
 */

// ─── Tablas de la norma ─────────────────────────────────────────────────────

/** Por versión: [codewords de corrección por bloque, b1, datos1, b2, datos2]. */
const RS_BLOCKS_M: readonly (readonly number[])[] = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37], [26, 4, 43, 1, 44], [30, 1, 50, 4, 51], [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42], [28, 7, 45, 3, 46],
  [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
  [26, 17, 42, 0, 0], [28, 17, 46, 0, 0], [28, 4, 47, 14, 48], [28, 6, 45, 14, 46],
  [28, 8, 47, 13, 48], [28, 19, 46, 4, 47], [28, 22, 45, 3, 46], [28, 3, 45, 23, 46],
  [28, 21, 45, 7, 46], [28, 19, 47, 10, 48], [28, 2, 46, 29, 47], [28, 10, 46, 23, 47],
  [28, 14, 46, 21, 47], [28, 14, 46, 23, 47], [28, 12, 47, 26, 48], [28, 6, 47, 34, 48],
  [28, 29, 46, 14, 47], [28, 13, 46, 32, 47], [28, 40, 47, 7, 48], [28, 18, 47, 31, 48],
];

/** Centros de los patrones de alineación por versión. */
const ALIGN: readonly (readonly number[])[] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
  [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
  [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
  [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

// ─── Aritmética de Galois GF(256) ───────────────────────────────────────────

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinomio generador de grado `n`. */
function generador(n: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Codewords de corrección Reed-Solomon para un bloque. */
function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = generador(ecLen);
  const res = new Uint8Array(data.length + ecLen);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j++) res[i + j] ^= mul(gen[j], coef);
  }
  return res.slice(data.length);
}

// ─── Bits ───────────────────────────────────────────────────────────────────

class Bits {
  private bits: number[] = [];
  push(valor: number, largo: number): void {
    for (let i = largo - 1; i >= 0; i--) this.bits.push((valor >> i) & 1);
  }
  get length(): number { return this.bits.length; }
  /** Rellena a byte y devuelve los codewords. */
  toBytes(): Uint8Array {
    while (this.bits.length % 8 !== 0) this.bits.push(0);
    const out = new Uint8Array(this.bits.length / 8);
    for (let i = 0; i < out.length; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | this.bits[i * 8 + j];
      out[i] = b;
    }
    return out;
  }
}

function capacidadDatos(version: number): number {
  const [, b1, d1, b2, d2] = RS_BLOCKS_M[version - 1];
  return b1 * d1 + b2 * d2;
}

/** Versión más chica donde cabe `bytes`. null si no cabe ni en la 40. */
export function versionPara(bytes: number): number | null {
  for (let v = 1; v <= 40; v++) {
    const cuentaLargo = v <= 9 ? 8 : 16;
    const bitsNecesarios = 4 + cuentaLargo + bytes * 8;
    if (bitsNecesarios <= capacidadDatos(v) * 8) return v;
  }
  return null;
}

/** Cuántos bytes caben en la versión más grande. */
export const CAPACIDAD_MAXIMA = capacidadDatos(40) - 3;

// ─── Codewords finales (con intercalado) ────────────────────────────────────

function codewords(datos: Uint8Array, version: number): Uint8Array {
  const [ecLen, b1, d1, b2, d2] = RS_BLOCKS_M[version - 1];
  const bloques: Uint8Array[] = [];
  const ecs: Uint8Array[] = [];
  let p = 0;
  for (let i = 0; i < b1; i++) { bloques.push(datos.slice(p, p + d1)); p += d1; }
  for (let i = 0; i < b2; i++) { bloques.push(datos.slice(p, p + d2)); p += d2; }
  for (const b of bloques) ecs.push(rsEncode(b, ecLen));

  const out: number[] = [];
  const maxDatos = Math.max(d1, d2);
  for (let i = 0; i < maxDatos; i++) {
    for (const b of bloques) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const e of ecs) out.push(e[i]);
  }
  return Uint8Array.from(out);
}

// ─── Matriz ─────────────────────────────────────────────────────────────────

type Celda = boolean | null;

function ponPatron(m: Celda[][], fila: number, col: number, patron: number[][]): void {
  for (let r = 0; r < patron.length; r++) {
    for (let c = 0; c < patron[r].length; c++) {
      const fr = fila + r;
      const fc = col + c;
      if (fr >= 0 && fr < m.length && fc >= 0 && fc < m.length) m[fr][fc] = patron[r][c] === 1;
    }
  }
}

const FINDER = [
  [1, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const ALINEACION = [
  [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1],
];

function esFuncional(version: number, size: number, r: number, c: number): boolean {
  // Buscadores con su separador y las zonas reservadas de formato.
  if (r <= 8 && c <= 8) return true;
  if (r <= 8 && c >= size - 8) return true;
  if (r >= size - 8 && c <= 8) return true;
  // Sincronía.
  if (r === 6 || c === 6) return true;
  // Alineación.
  for (const ar of ALIGN[version - 1]) {
    for (const ac of ALIGN[version - 1]) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
      if (r >= ar - 2 && r <= ar + 2 && c >= ac - 2 && c <= ac + 2) return true;
    }
  }
  // Información de versión (7 en adelante).
  if (version >= 7) {
    if (c < 6 && r >= size - 11 && r <= size - 9) return true;
    if (r < 6 && c >= size - 11 && c <= size - 9) return true;
  }
  return false;
}

function mascara(patron: number, r: number, c: number): boolean {
  switch (patron) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

/** BCH(15,5) del formato. Nivel M = 0b00. */
function bitsFormato(patron: number): number {
  let d = (0b00 << 3) | patron;
  let v = d << 10;
  for (let i = 4; i >= 0; i--) {
    if ((v >> (i + 10)) & 1) v ^= 0x537 << i;
  }
  return ((d << 10) | v) ^ 0x5412;
}

/** BCH(18,6) de la versión (7 en adelante). */
function bitsVersion(version: number): number {
  let v = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((v >> (i + 12)) & 1) v ^= 0x1f25 << i;
  }
  return (version << 12) | v;
}

/**
 * Puntaje de "fealdad" de una máscara. Se prueban las ocho y gana la de menos
 * puntos.
 *
 * Se usa la variante del generador de referencia (la regla 1 mide vecindad de
 * 3x3, no corridas). Es una decisión consciente: CUALQUIERA de las ocho
 * máscaras produce un QR válido y legible, así que esto es una heurística de
 * calidad, no de corrección. Copiar la del generador de referencia permite
 * verificar la salida módulo a módulo contra él, que vale más que discutir
 * cuál heurística es más elegante.
 */
export function penalizacion(m: boolean[][]): number {
  const n = m.length;
  let total = 0;

  // Regla 1: vecinos del mismo color en la vecindad de 3x3.
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      let iguales = 0;
      const oscuro = m[row][col];
      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || row + r >= n) continue;
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || col + c >= n) continue;
          if (r === 0 && c === 0) continue;
          if (oscuro === m[row + r][col + c]) iguales++;
        }
      }
      if (iguales > 5) total += 3 + iguales - 5;
    }
  }

  // Regla 2: bloques de 2x2 de un solo color.
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      let cuenta = 0;
      if (m[r][c]) cuenta++;
      if (m[r + 1][c]) cuenta++;
      if (m[r][c + 1]) cuenta++;
      if (m[r + 1][c + 1]) cuenta++;
      if (cuenta === 0 || cuenta === 4) total += 3;
    }
  }

  // Regla 3: el 1:1:3:1:1, que se confunde con un buscador.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c + 6 < n; c++) {
      if (m[r][c] && !m[r][c + 1] && m[r][c + 2] && m[r][c + 3] && m[r][c + 4] && !m[r][c + 5] && m[r][c + 6]) total += 40;
    }
  }
  for (let c = 0; c < n; c++) {
    for (let r = 0; r + 6 < n; r++) {
      if (m[r][c] && !m[r + 1][c] && m[r + 2][c] && m[r + 3][c] && m[r + 4][c] && !m[r + 5][c] && m[r + 6][c]) total += 40;
    }
  }

  // Regla 4: proporción de oscuros contra el 50%.
  let oscuros = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) oscuros++;
  total += (Math.abs((100 * oscuros) / n / n - 50) / 5) * 10;

  return total;
}

/**
 * Matriz del QR (true = módulo oscuro). null si el texto no cabe ni en la
 * versión 40, que para una ficha de emergencia querría decir que hay que
 * recortarla antes de pedir el código.
 */
export function qrMatrix(texto: string, patronForzado?: number, pruebaForzada = false): boolean[][] | null {
  // El payload viaja como bytes UTF-8 en modo BYTE.
  const bytes: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    let c = texto.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < texto.length) {
      const next = texto.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00); i++; }
    }
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }

  const version = versionPara(bytes.length);
  if (!version) return null;
  const size = version * 4 + 17;

  // Segmento: modo BYTE + cuenta + datos + terminador + relleno.
  const bits = new Bits();
  bits.push(0b0100, 4);
  bits.push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) bits.push(b, 8);
  const capacidad = capacidadDatos(version) * 8;
  bits.push(0, Math.min(4, capacidad - bits.length));
  const datos = new Uint8Array(capacidadDatos(version));
  const parciales = bits.toBytes();
  datos.set(parciales);
  for (let i = parciales.length; i < datos.length; i++) datos[i] = (i - parciales.length) % 2 === 0 ? 0xec : 0x11;

  const finales = codewords(datos, version);

  // Esqueleto con los patrones fijos.
  const base: Celda[][] = Array.from({ length: size }, () => Array<Celda>(size).fill(null));
  ponPatron(base, 0, 0, FINDER);
  ponPatron(base, 0, size - 7, FINDER);
  ponPatron(base, size - 7, 0, FINDER);
  // Separadores.
  for (let i = 0; i < 8; i++) {
    base[7][i] = false; base[i][7] = false;
    base[7][size - 1 - i] = false; base[i][size - 8] = false;
    base[size - 8][i] = false; base[size - 1 - i][7] = false;
  }
  // Sincronía.
  for (let i = 8; i < size - 8; i++) {
    base[6][i] = i % 2 === 0;
    base[i][6] = i % 2 === 0;
  }
  // Alineación.
  for (const ar of ALIGN[version - 1]) {
    for (const ac of ALIGN[version - 1]) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue;
      ponPatron(base, ar - 2, ac - 2, ALINEACION);
    }
  }
  // Módulo oscuro, que siempre va.
  base[size - 8][8] = true;

  // Información de versión.
  if (version >= 7) {
    const vb = bitsVersion(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vb >> i) & 1) === 1;
      base[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
      base[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }

  // Datos en zigzag desde abajo a la derecha, saltando la columna 6.
  const puestos: [number, number][] = [];
  let arriba = true;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let k = 0; k < size; k++) {
      const r = arriba ? size - 1 - k : k;
      for (const cc of [c, c - 1]) {
        if (!esFuncional(version, size, r, cc)) puestos.push([r, cc]);
      }
    }
    arriba = !arriba;
  }

  /**
   * `prueba` = la pasada con la que se eligen las máscaras. En ella el área de
   * formato y el módulo oscuro van en claro, porque todavía no se sabe qué
   * formato se va a escribir: el puntaje no puede depender de lo que aún no
   * está decidido.
   */
  const conDatos = (patron: number, prueba = false): boolean[][] => {
    const m = base.map((fila) => fila.slice());
    if (prueba) {
      m[size - 8][8] = false;
      // La información de versión tampoco está escrita todavía.
      if (version >= 7) {
        for (let i = 0; i < 18; i++) {
          m[Math.floor(i / 3)][size - 11 + (i % 3)] = false;
          m[size - 11 + (i % 3)][Math.floor(i / 3)] = false;
        }
      }
    }
    puestos.forEach(([r, c], i) => {
      const byte = finales[i >> 3];
      const bit = byte === undefined ? false : ((byte >> (7 - (i & 7))) & 1) === 1;
      m[r][c] = bit !== mascara(patron, r, c);
    });
    // Formato, en sus dos copias.
    const f = bitsFormato(patron);
    for (let i = 0; i < 15; i++) {
      const bit = !prueba && ((f >> i) & 1) === 1;
      // Tira vertical: columna 8, saltándose la línea de sincronía (fila 6) y
      // el módulo oscuro. Los últimos siete bits caen junto al buscador de
      // abajo a la izquierda.
      if (i < 6) m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else m[size - 15 + i][8] = bit;

      // Tira horizontal: fila 8, de derecha a izquierda.
      if (i < 8) m[8][size - i - 1] = bit;
      else if (i === 8) m[8][7] = bit;
      else m[8][14 - i] = bit;
    }
    return m.map((fila) => fila.map((v) => v === true));
  };

  // `patronForzado` existe para el test que compara contra el generador de
  // referencia máscara por máscara. En la app nunca se pasa.
  if (patronForzado != null) return conDatos(patronForzado, pruebaForzada);

  let mejorPatron = 0;
  let mejorPuntaje = Infinity;
  for (let p = 0; p < 8; p++) {
    const puntaje = penalizacion(conDatos(p, true));
    if (puntaje < mejorPuntaje) { mejorPuntaje = puntaje; mejorPatron = p; }
  }
  return conDatos(mejorPatron);
}
