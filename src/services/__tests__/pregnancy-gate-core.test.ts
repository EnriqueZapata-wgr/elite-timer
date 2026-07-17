import { describe, expect, it } from 'vitest';

import { resolvePregnancyActive } from '../pregnancy-gate-core';

describe('resolvePregnancyActive (#4 P0 clínico)', () => {
  it('HOMBRE con is_pregnant=true residual → false (gate por sexo)', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: 'male', pregnancyStatus: { is_pregnant: true } }),
    ).toBe(false);
  });

  it('HOMBRE con cycle_modality=pregnancy residual → false', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: 'male', cycleModality: 'pregnancy' }),
    ).toBe(false);
  });

  it('sexo null/undefined nunca activa la máscara', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: null, pregnancyStatus: { is_pregnant: true } }),
    ).toBe(false);
    expect(resolvePregnancyActive({ pregnancyStatus: { is_pregnant: true } })).toBe(false);
  });

  it('FEMALE con is_pregnant=true → true', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: 'female', pregnancyStatus: { is_pregnant: true } }),
    ).toBe(true);
  });

  it('FEMALE con cycle_modality=pregnancy → true', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: 'female', cycleModality: 'pregnancy' }),
    ).toBe(true);
  });

  it('FEMALE sin flags → false (fail-soft)', () => {
    expect(resolvePregnancyActive({ biologicalSex: 'female' })).toBe(false);
    expect(
      resolvePregnancyActive({ biologicalSex: 'female', pregnancyStatus: { is_pregnant: false } }),
    ).toBe(false);
  });

  it('pregnancy_status malformado (string/array) no truena ni activa', () => {
    expect(
      resolvePregnancyActive({ biologicalSex: 'female', pregnancyStatus: 'true' }),
    ).toBe(false);
  });
});
