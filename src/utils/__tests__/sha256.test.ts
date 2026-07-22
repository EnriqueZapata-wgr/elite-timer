import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../sha256';

function nodeSha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

describe('sha256Hex (Sprint Compliance 2 — texto_hash consentimiento)', () => {
  it('vectores conocidos FIPS', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('coincide con node:crypto en textos legales reales (acentos, ñ, comillas)', () => {
    const samples = [
      'He leído y acepto los Términos y Condiciones y el Aviso de Privacidad.',
      'Confirmo que soy mayor de 18 años.',
      'ñÑáéíóúü — «comillas» y emoji 🧬💧',
      'x'.repeat(1000),
    ];
    for (const s of samples) {
      expect(sha256Hex(s)).toBe(nodeSha256(s));
    }
  });

  it('longitudes que cruzan el límite de bloque (55/56/64 bytes)', () => {
    for (const n of [55, 56, 63, 64, 65, 119, 120]) {
      const s = 'a'.repeat(n);
      expect(sha256Hex(s)).toBe(nodeSha256(s));
    }
  });
});
