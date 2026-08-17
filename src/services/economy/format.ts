/**
 * Formato compacto de cantidades: 23500 → "23.5K", 1247500 → "1.2M". PURO/testeable.
 *
 * PREMIUM (16-ago-2026): nació para pintar saldos de H+; hoy solo formatea
 * electrones, rangos y conteos. Se queda porque el formato es genérico y lo
 * usan varias pantallas, pero ya no habla de moneda.
 */
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
