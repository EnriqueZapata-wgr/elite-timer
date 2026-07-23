import { describe, it, expect } from 'vitest';
import {
  qualifiesForPracticeElectron,
  classifyPracticeAwardError,
  extraPracticeIdempotencyKey,
  PRACTICE_CAP_TOKEN,
  PRACTICE_SPACING_TOKEN,
} from '../practice-electron-core';

describe('qualifiesForPracticeElectron (≥80% del tiempo real)', () => {
  it('otorga exactamente en el umbral del 80%', () => {
    expect(qualifiesForPracticeElectron(480, 600)).toBe(true);  // 80% exacto
    expect(qualifiesForPracticeElectron(479, 600)).toBe(false); // 79.8%
    expect(qualifiesForPracticeElectron(600, 600)).toBe(true);  // completa
  });

  it('salir temprano no califica; pasarse de la duración sí', () => {
    expect(qualifiesForPracticeElectron(60, 600)).toBe(false);
    expect(qualifiesForPracticeElectron(700, 600)).toBe(true);
  });

  it('duraciones inválidas nunca califican', () => {
    expect(qualifiesForPracticeElectron(100, 0)).toBe(false);
    expect(qualifiesForPracticeElectron(100, -5)).toBe(false);
    expect(qualifiesForPracticeElectron(0, 600)).toBe(false);
    expect(qualifiesForPracticeElectron(NaN, 600)).toBe(false);
    expect(qualifiesForPracticeElectron(100, NaN)).toBe(false);
  });

  it('pieza corta real (pausa_1min, 68s medidos con ffprobe)', () => {
    expect(qualifiesForPracticeElectron(55, 68)).toBe(true);  // 80.9%
    expect(qualifiesForPracticeElectron(54, 68)).toBe(false); // 79.4%
  });
});

describe('classifyPracticeAwardError (contrato con el trigger 213)', () => {
  it('detecta cap y espaciado por token en el mensaje', () => {
    expect(classifyPracticeAwardError(`${PRACTICE_CAP_TOKEN}: máximo 3 electrones de meditation por día`))
      .toBe('cap_reached');
    expect(classifyPracticeAwardError(`${PRACTICE_SPACING_TOKEN}: espera 3 horas entre prácticas de breathwork`))
      .toBe('spacing');
  });

  it('otros errores no se clasifican (error real)', () => {
    expect(classifyPracticeAwardError('duplicate key value violates unique constraint')).toBe(null);
    expect(classifyPracticeAwardError('')).toBe(null);
    expect(classifyPracticeAwardError(null)).toBe(null);
    expect(classifyPracticeAwardError(undefined)).toBe(null);
  });
});

describe('extraPracticeIdempotencyKey (2º/3º award del día)', () => {
  it('extiende la key determinística con nonce — no colisiona con la del 1er award', () => {
    const first = 'u1:meditation:2026-07-23';
    const extra = extraPracticeIdempotencyKey('u1', 'meditation', '2026-07-23', 'ab12cd34');
    expect(extra).toBe('u1:meditation:2026-07-23:ab12cd34');
    expect(extra).not.toBe(first);
    expect(extra.startsWith(first)).toBe(true);
  });
});
