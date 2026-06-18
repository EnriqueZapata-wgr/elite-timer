import { describe, it, expect } from 'vitest';
import { planChunks, shouldSplit } from '@/src/services/lab-pdf-splitter';

describe('lab-pdf-splitter — planChunks', () => {
  it('6 páginas / 3 → 2 chunks [1-3][4-6]', () => {
    expect(planChunks(6, 3)).toEqual([
      { index: 0, startPage: 1, endPage: 3 },
      { index: 1, startPage: 4, endPage: 6 },
    ]);
  });
  it('10 páginas / 3 → 4 chunks (3+3+3+1)', () => {
    const c = planChunks(10, 3);
    expect(c.length).toBe(4);
    expect(c[3]).toEqual({ index: 3, startPage: 10, endPage: 10 });
  });
  it('1 página → 1 chunk', () => {
    expect(planChunks(1, 3)).toEqual([{ index: 0, startPage: 1, endPage: 1 }]);
  });
  it('pageCount inválido → []', () => {
    expect(planChunks(0)).toEqual([]);
    expect(planChunks(NaN)).toEqual([]);
  });
  it('pagesPerChunk < 1 se normaliza a 1', () => {
    expect(planChunks(2, 0).length).toBe(2);
  });
});

describe('lab-pdf-splitter — shouldSplit', () => {
  it('>5 páginas → split', () => { expect(shouldSplit(6)).toBe(true); });
  it('≤5 páginas → no split', () => { expect(shouldSplit(5)).toBe(false); expect(shouldSplit(1)).toBe(false); });
});
