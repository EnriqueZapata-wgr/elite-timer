/** Formato compacto de moneda: 23500 → "23.5K", 1247500 → "1.2M". PURO/testeable. */
function strip(s: string): string {
  return s.replace(/\.0$/, '');
}

export function formatCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000) return sign + strip((v / 1_000_000).toFixed(1)) + 'M';
  if (v >= 1_000) return sign + strip((v / 1_000).toFixed(1)) + 'K';
  return sign + String(Math.round(v));
}

/** Formato con separador de miles: 1247500 → "1,247,500". */
export function formatFull(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
