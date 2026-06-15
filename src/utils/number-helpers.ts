/**
 * Helpers de parseo numérico para inputs de captura manual.
 *
 * Mariana flag #10: el teclado decimal en es-MX produce coma (`6,5`) pero parseFloat
 * corta en la coma (`parseFloat('6,5') === 6`). Normalizamos coma→punto antes de parsear
 * para que `6,5` y `6.5` sean equivalentes en sueño, HbA1c, composición, etc.
 */

/**
 * Parsea un input de texto a número aceptando coma O punto como separador decimal.
 * @returns el número, o null si el input está vacío o no es un número finito.
 */
export function parseDecimalInput(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // Normalizar coma decimal → punto. Quitar separadores de miles no aplica aquí
  // (los valores de biomarcadores no llevan separador de miles en captura manual).
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
