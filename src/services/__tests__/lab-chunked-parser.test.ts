import { describe, it, expect } from 'vitest';
import { mergeChunkResults, type SettledChunk } from '@/src/services/lab-chunked-parser';

const ok = (value: any): SettledChunk => ({ status: 'fulfilled', value });
const fail = (reason: any): SettledChunk => ({ status: 'rejected', reason });

describe('lab-chunked-parser — mergeChunkResults', () => {
  it('combina valores de varios chunks', () => {
    const m = mergeChunkResults([
      ok({ values: { glucose: { value: 90, passedValidation: true } }, lab_name: 'Unilabs' }),
      ok({ values: { hdl: { value: 60, passedValidation: true } } }),
    ]);
    expect(m.values.glucose.value).toBe(90);
    expect(m.values.hdl.value).toBe(60);
    expect(m.lab_name).toBe('Unilabs');
    expect(m.successCount).toBe(2);
    expect(m.totalChunks).toBe(2);
  });

  it('duplicado → gana la 1ª ocurrencia (página 1 = totales)', () => {
    const m = mergeChunkResults([
      ok({ values: { ldl: { value: 100, passedValidation: true } } }),
      ok({ values: { ldl: { value: 150, passedValidation: true } } }),
    ]);
    expect(m.values.ldl.value).toBe(100);
    expect(m.values.ldl.chunkIndex).toBe(0);
  });

  it('válido le gana a no-válido aunque venga después', () => {
    const m = mergeChunkResults([
      ok({ values: { ldl: { value: 2.27, passedValidation: false } } }),
      ok({ values: { ldl: { value: 100, passedValidation: true } } }),
    ]);
    expect(m.values.ldl.value).toBe(100);
  });

  it('error parcial: 1 chunk falla, otros OK → resultado válido + error registrado', () => {
    const m = mergeChunkResults([
      ok({ values: { glucose: { value: 90, passedValidation: true } } }),
      fail(new Error('anthropic_timeout')),
    ]);
    expect(m.successCount).toBe(1);
    expect(m.errors).toEqual([{ chunkIndex: 1, reason: 'anthropic_timeout' }]);
    expect(m.values.glucose.value).toBe(90);
  });

  it('todos fallan → values vacío + errors poblado (caller marca failed)', () => {
    const m = mergeChunkResults([fail('a'), fail('b')]);
    expect(Object.keys(m.values).length).toBe(0);
    expect(m.errors.length).toBe(2);
    expect(m.successCount).toBe(0);
  });

  it('concatena other_values de todos los chunks', () => {
    const m = mergeChunkResults([
      ok({ values: {}, other_values: [{ name: 'x' }] }),
      ok({ values: {}, other_values: [{ name: 'y' }] }),
    ]);
    expect(m.other_values).toHaveLength(2);
  });
});
