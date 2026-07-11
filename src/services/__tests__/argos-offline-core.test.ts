import { describe, it, expect } from 'vitest';
import { buildOfflineArgosMessage } from '@/src/services/argos-offline-core';

describe('buildOfflineArgosMessage (bug #8 — chat sin internet)', () => {
  it('con nombre completo usa solo el primer nombre', () => {
    expect(buildOfflineArgosMessage('Enrique Zapata')).toBe(
      'Se me fue la señal, Enrique. Reintenta en unos minutos.',
    );
  });

  it('con un solo nombre lo usa tal cual', () => {
    expect(buildOfflineArgosMessage('Paty')).toBe(
      'Se me fue la señal, Paty. Reintenta en unos minutos.',
    );
  });

  it('sin nombre (null/undefined/vacío/espacios) usa el copy sin nombre', () => {
    const expected = 'Se me fue la señal. Reintenta en unos minutos.';
    expect(buildOfflineArgosMessage(null)).toBe(expected);
    expect(buildOfflineArgosMessage(undefined)).toBe(expected);
    expect(buildOfflineArgosMessage('')).toBe(expected);
    expect(buildOfflineArgosMessage('   ')).toBe(expected);
  });
});
