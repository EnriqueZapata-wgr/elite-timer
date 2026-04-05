/**
 * Utilidad para adaptar textos al género del usuario.
 *
 * Convierte terminaciones masculinas a femeninas cuando el sexo es 'female'.
 */
const REPLACEMENTS: Record<string, string> = {
  agradecido: 'agradecida',
  bienvenido: 'bienvenida',
  conectado: 'conectada',
  listo: 'lista',
  preparado: 'preparada',
  enfocado: 'enfocada',
  motivado: 'motivada',
  comprometido: 'comprometida',
  decidido: 'decidida',
  centrado: 'centrada',
};

export function genderize(text: string, sex: 'male' | 'female' | string | null | undefined): string {
  if (!sex || sex !== 'female') return text;

  let result = text;
  for (const [male, female] of Object.entries(REPLACEMENTS)) {
    // Reemplazo case-insensitive preservando capitalización
    result = result.replace(new RegExp(male, 'gi'), (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return female.charAt(0).toUpperCase() + female.slice(1);
      }
      return female;
    });
  }
  return result;
}
