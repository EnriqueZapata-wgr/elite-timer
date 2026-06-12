/**
 * Hash estable del set de datos integrados que alimentan el cálculo de Edad ATP.
 * Sirve para NO recalcular (no gastar coins de LLM / cómputo) si la data no cambió (#15)
 * y para el badge "Datos nuevos" (#16). PURO y determinista — sin crypto.randomUUID
 * (regla CLAUDE.md #2), sin Date.now. Mismo set → mismo hash.
 */

export type DatasetEntry = { key: string; value: number; measured_at?: string };

/** FNV-1a 32-bit → hex. Determinista, suficiente para detectar cambios (no es seguridad). */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // multiplicación FNV con math de 32 bits sin perder precisión.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Normaliza un número a string estable (evita -0, redondea ruido de coma flotante). */
function numToken(v: number): string {
  if (!Number.isFinite(v)) return 'NaN';
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? '0' : String(r);
}

/**
 * Hash del set de datos. Ordena por key (estable ante orden de carga) e incluye la fecha de
 * medición por-valor (un mismo valor en distinta fecha = cambio real que sí amerita recalcular).
 */
export function computeDatasetHash(entries: DatasetEntry[]): string {
  const tokens = entries
    .filter((e) => e && typeof e.value === 'number' && Number.isFinite(e.value))
    .map((e) => `${e.key}:${numToken(e.value)}@${e.measured_at ?? ''}`)
    .sort();
  return fnv1a(tokens.join('|'));
}

/** Aplana un mapa { key: value } a entradas (sin fecha) para hashear. */
export function entriesFromDict(dict: Record<string, number>): DatasetEntry[] {
  return Object.entries(dict).map(([key, value]) => ({ key, value }));
}
