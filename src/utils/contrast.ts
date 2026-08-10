/**
 * contrast — cálculo WCAG 2.x puro (MB-31A · Pieza 1).
 *
 * La luminancia relativa y el ratio de contraste con la fórmula oficial.
 * Lo usan el candado de contrastes del manual de marca (tests) y el clamp
 * AA del velo nocturno in-app (night-veil-core). Sin RN, sin efectos.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** '#RGB' o '#RRGGBB' → canales 0-255. */
export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Canal sRGB 0-255 → lineal (curva de la spec WCAG). */
function linear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminancia relativa 0..1. */
export function relativeLuminance(c: Rgb | string): number {
  const rgb = typeof c === 'string' ? hexToRgb(c) : c;
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

/** Ratio de contraste 1..21 entre dos colores opacos. */
export function contrastRatio(a: Rgb | string, b: Rgb | string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Compone un color con alpha encima de una base opaca (el velo sobre la UI). */
export function compositeOver(top: Rgb & { a: number }, base: Rgb | string): Rgb {
  const b = typeof base === 'string' ? hexToRgb(base) : base;
  return {
    r: Math.round(top.r * top.a + b.r * (1 - top.a)),
    g: Math.round(top.g * top.a + b.g * (1 - top.a)),
    b: Math.round(top.b * top.a + b.b * (1 - top.a)),
  };
}
