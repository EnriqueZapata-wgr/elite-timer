import { describe, expect, it } from 'vitest';

import { base64ToUint8Array } from '../base64';

function toString(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
}

describe('base64ToUint8Array', () => {
  it('decodifica con padding', () => {
    expect(toString(base64ToUint8Array('aGVsbG8='))).toBe('hello');
    expect(toString(base64ToUint8Array('aG9sYQ=='))).toBe('hola');
  });

  it('decodifica sin padding', () => {
    expect(toString(base64ToUint8Array('aGVsbG8'))).toBe('hello');
  });

  it('decodifica string vacío', () => {
    expect(base64ToUint8Array('').length).toBe(0);
  });

  it('tolera whitespace y newlines', () => {
    expect(toString(base64ToUint8Array('aGVs\nbG8='))).toBe('hello');
  });

  it('decodifica bytes binarios (no-ASCII)', () => {
    // 0x00 0xFF 0x10 → 'AP8Q'
    const bytes = base64ToUint8Array('AP8Q');
    expect(Array.from(bytes)).toEqual([0, 255, 16]);
  });

  it('lanza en caracteres inválidos', () => {
    expect(() => base64ToUint8Array('aGV$bG8=')).toThrow(/inválido/);
  });
});
