/**
 * Helpers puros de <TestInputScreen> — sin React Native, testeables con vitest.
 * (El componente .tsx los reusa; los tests importan SOLO de aquí para no arrastrar RN.)
 */
export type InputType = 'number' | 'time' | 'reps' | 'distance';

/** 'reps' es siempre entero; los demás respetan `decimals` (default 0). */
export function effectiveDecimals(inputType: InputType, decimals?: number): number {
  if (inputType === 'reps') return 0;
  return decimals ?? 0;
}

/**
 * Parsea el texto del input a número según tipo/decimales. Devuelve null si no es un
 * número finito. Redondea a los decimales efectivos (enteros para reps).
 */
export function parseInputValue(
  text: string,
  inputType: InputType,
  decimals?: number,
): number | null {
  const cleaned = (text ?? '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  const d = effectiveDecimals(inputType, decimals);
  const factor = 10 ** d;
  return Math.round(n * factor) / factor;
}

/** Valida rango [min, max] (inclusivo). null nunca es válido. */
export function isValueValid(value: number | null, min?: number, max?: number): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/** Formatea segundos a reloj: M:SS (<1h) o H:MM:SS (≥1h). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
