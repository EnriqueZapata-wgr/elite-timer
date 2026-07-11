import { describe, it, expect } from 'vitest';
import { extractResponseText } from '@/src/services/anthropic-response-core';

/**
 * HOTFIX Sonnet 5 — adaptive thinking default: content[0] ya no es
 * necesariamente el bloque de texto. extractResponseText debe concatenar
 * SOLO los bloques type==='text' y devolver '' en cualquier otro caso.
 */
describe('extractResponseText', () => {
  it('[text] — respuesta clásica sin thinking', () => {
    expect(extractResponseText({ content: [{ type: 'text', text: 'hola' }] })).toBe('hola');
  });

  it('[thinking, text] — Sonnet 5 con adaptive thinking', () => {
    const data = {
      content: [
        { type: 'thinking', thinking: 'razonando...' },
        { type: 'text', text: 'respuesta real' },
      ],
    };
    expect(extractResponseText(data)).toBe('respuesta real');
  });

  it('[thinking, text, text] — concatena múltiples bloques text en orden', () => {
    const data = {
      content: [
        { type: 'thinking', thinking: 'hmm' },
        { type: 'text', text: 'parte 1 ' },
        { type: 'text', text: 'parte 2' },
      ],
    };
    expect(extractResponseText(data)).toBe('parte 1 parte 2');
  });

  it('[] — content vacío devuelve string vacío', () => {
    expect(extractResponseText({ content: [] })).toBe('');
  });

  it('undefined / null / sin content devuelve string vacío', () => {
    expect(extractResponseText(undefined)).toBe('');
    expect(extractResponseText(null)).toBe('');
    expect(extractResponseText({})).toBe('');
    expect(extractResponseText({ content: 'no-array' })).toBe('');
  });

  it('bloques malformados no rompen (text sin string, null blocks)', () => {
    const data = {
      content: [
        null,
        { type: 'text' },
        { type: 'text', text: 42 },
        { type: 'text', text: 'ok' },
      ],
    };
    expect(extractResponseText(data)).toBe('ok');
  });

  it('[thinking] solo — sin bloque text devuelve string vacío', () => {
    expect(extractResponseText({ content: [{ type: 'thinking', thinking: 'x' }] })).toBe('');
  });
});
