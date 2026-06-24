/**
 * generateUUID — helper canónico de UUID v4 para toda la app (regla #2 de CLAUDE.md:
 * NUNCA `crypto.randomUUID` directo en el código de feature → siempre este helper).
 *
 * Intenta `crypto.randomUUID()` (disponible en Hermes moderno) y cae a un generador
 * manual compatible con Hermes/RN y con el tipo `uuid` de Postgres. Una sola fuente —
 * antes estaba duplicado en routine-service.ts y protocol-builder-service.ts.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
