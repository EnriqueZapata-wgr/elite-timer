/**
 * argos-offline-core — copy del estado offline del chat ARGOS (bug #8).
 * Node-only (cero imports RN/expo) para testearse con Vitest.
 */

/**
 * Mensaje que ARGOS muestra cuando el submit se hace sin conexión.
 * Copy aprobado: "Se me fue la señal{, nombre}. Reintenta en unos minutos."
 * Usa solo el primer nombre si viene el nombre completo; sin nombre si no hay.
 */
export function buildOfflineArgosMessage(fullName?: string | null): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] || '';
  return first
    ? `Se me fue la señal, ${first}. Reintenta en unos minutos.`
    : 'Se me fue la señal. Reintenta en unos minutos.';
}
