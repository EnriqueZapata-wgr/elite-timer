/**
 * Anthropic Response Core — parsing puro de respuestas no-stream del proxy.
 *
 * Node-only (cero imports RN/expo) para poder testearse con Vitest.
 *
 * HOTFIX 2026-07-10: claude-sonnet-5 activa adaptive thinking POR DEFAULT
 * cuando el request omite `thinking` → la respuesta llega con
 * content = [{type:'thinking',...}, {type:'text',...}]. Leer content[0].text
 * devuelve undefined y rompía DX generation, food estimate, reportes, etc.
 * Este helper concatena SOLO los bloques type==='text', ignorando thinking
 * y cualquier otro tipo de bloque.
 */

/** Extrae el texto de una respuesta no-stream de Anthropic (via proxy). */
export function extractResponseText(data: any): string {
  const content = data?.content;
  if (!Array.isArray(content)) return '';
  let out = '';
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') {
      out += block.text;
    }
  }
  return out;
}
