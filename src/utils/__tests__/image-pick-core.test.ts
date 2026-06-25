import { describe, it, expect } from 'vitest';
import { seededIndex, categoryToFolder, sexKey, cronotipoKey } from '@/src/utils/image-pick-core';

/**
 * #asset-swap — lógica pura de selección de imágenes. (Los pickers con require('.png') no se
 * pueden importar en vitest; aquí validamos su núcleo: hashing determinístico + mapeos.)
 */
describe('seededIndex', () => {
  it('misma seed → mismo índice (determinístico, no salta)', () => {
    expect(seededIndex('u1-evt-2026-06-24', 4)).toBe(seededIndex('u1-evt-2026-06-24', 4));
  });
  it('índice siempre en rango [0, length)', () => {
    for (const s of ['a', 'bb', 'ccc', 'usuario-123-cardio']) {
      const i = seededIndex(s, 3);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(3);
    }
  });
  it('sin seed → 0; length 0 → 0', () => {
    expect(seededIndex(undefined, 4)).toBe(0);
    expect(seededIndex('x', 0)).toBe(0);
  });
  it('seeds distintas pueden dar índices distintos', () => {
    // 'a'(97) vs 'b'(98) en length 4 → 97%4=1, 98%4=2
    expect(seededIndex('a', 4)).toBe(1);
    expect(seededIndex('b', 4)).toBe(2);
  });
});

describe('categoryToFolder', () => {
  it('mapea categorías base', () => {
    expect(categoryToFolder('meal', 'Comida', 13)).toBe('comida');
    expect(categoryToFolder('exercise', 'Fuerza', 10)).toBe('entrenar');
    expect(categoryToFolder('exercise', 'Cardio Z2', 10)).toBe('cardio');
    expect(categoryToFolder('supplement', 'Stack AM', 8)).toBe('suplementos');
    expect(categoryToFolder('mind', 'Meditación', 9)).toBe('meditacion');
    expect(categoryToFolder('recovery', 'Dormir', 22)).toBe('sleep');
  });
  it('rhythm: sol AM vs PM según hora', () => {
    expect(categoryToFolder('rhythm', 'Luz solar', 8)).toBe('sol-am');
    expect(categoryToFolder('rhythm', 'Sol de la tarde', 17)).toBe('sol-pm');
  });
  it('rhythm: despertar / hidratación / off-pantallas / otros', () => {
    expect(categoryToFolder('rhythm', 'Despertar', 6)).toBe('despertar');
    expect(categoryToFolder('rhythm', 'Hidratación', 12)).toBe('hidratacion');
    expect(categoryToFolder('rhythm', 'Off pantallas', 21)).toBe('off-pantallas');
    expect(categoryToFolder('rhythm', 'Algo raro', 12)).toBe('otros');
  });
  it('categoría desconocida → otros', () => {
    expect(categoryToFolder('weird', 'X', 12)).toBe('otros');
  });
});

describe('sexKey', () => {
  it('female → female; resto → male', () => {
    expect(sexKey('female')).toBe('female');
    expect(sexKey('male')).toBe('male');
    expect(sexKey(undefined)).toBe('male');
    expect(sexKey('intersex')).toBe('male');
  });
});

describe('cronotipoKey', () => {
  it('acepta inglés (modelo) y español → clave ES', () => {
    expect(cronotipoKey('lion')).toBe('leon');
    expect(cronotipoKey('wolf')).toBe('lobo');
    expect(cronotipoKey('bear')).toBe('oso');
    expect(cronotipoKey('dolphin')).toBe('delfin');
    expect(cronotipoKey('LEON')).toBe('leon');
  });
  it('desconocido / vacío → leon (fallback)', () => {
    expect(cronotipoKey(undefined)).toBe('leon');
    expect(cronotipoKey('xyz')).toBe('leon');
  });
});
