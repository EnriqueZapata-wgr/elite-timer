import { describe, it, expect } from 'vitest';
import { mergeReviews } from '@/src/services/edad-atp/lab-review-merge';
import type { ProcessedItem } from '@/src/services/edad-atp/lab-parser-process';
import type { LabReviewPayload } from '@/src/services/lab-service';

function item(key: string, value: number, o: Partial<ProcessedItem> = {}): ProcessedItem {
  return {
    key, rawValue: value, valueCanonical: value, unitInDocument: null, unitCanonical: 'mg/dL',
    conversionMethod: 'identity', confidence: 'high', rawTextSnippet: null, passedValidation: true, ...o,
  };
}
function review(uploadId: string, items: ProcessedItem[], extra: Partial<LabReviewPayload> = {}): LabReviewPayload {
  return { uploadId, userId: 'u', labName: null, labDate: '2026-06-01', items, derived: [], otherValues: [], ...extra };
}

describe('lab-review-merge — mergeReviews', () => {
  it('una sola revisión → misma lista, uploadIds poblado, sin duplicados', () => {
    const m = mergeReviews([review('a', [item('ldl', 100)])]);
    expect(m.items.length).toBe(1);
    expect(m.uploadIds).toEqual(['a']);
    expect(m.duplicates ?? {}).toEqual({});
  });

  it('keys disjuntos de 2 fotos → se combinan, sin duplicados', () => {
    const m = mergeReviews([review('a', [item('ldl', 100)]), review('b', [item('hdl', 60)])]);
    expect(m.items.map((i) => i.key).sort()).toEqual(['hdl', 'ldl']);
    expect(m.duplicates ?? {}).toEqual({});
    expect(m.uploadIds).toEqual(['a', 'b']);
  });

  it('key duplicado entre fotos → un item + candidatos en duplicates', () => {
    const m = mergeReviews([
      review('a', [item('ldl', 100, { confidence: 'high' })]),
      review('b', [item('ldl', 150, { confidence: 'medium' })]),
    ]);
    expect(m.items.filter((i) => i.key === 'ldl').length).toBe(1);
    expect(m.duplicates?.ldl?.length).toBe(2);
  });

  it('elige el mejor candidato: válido + alta confianza por defecto', () => {
    const m = mergeReviews([
      review('a', [item('ldl', 100, { confidence: 'high', passedValidation: true })]),
      review('b', [item('ldl', 150, { confidence: 'medium', passedValidation: true })]),
    ]);
    expect(m.items.find((i) => i.key === 'ldl')?.valueCanonical).toBe(100);
  });

  it('un válido le gana a un inválido aunque tenga menor confianza', () => {
    const m = mergeReviews([
      review('a', [item('ldl', 2.27, { confidence: 'high', passedValidation: false })]),
      review('b', [item('ldl', 100, { confidence: 'medium', passedValidation: true })]),
    ]);
    expect(m.items.find((i) => i.key === 'ldl')?.valueCanonical).toBe(100);
  });

  it('recalcula derivados desde los valores elegidos', () => {
    const m = mergeReviews([
      review('a', [item('triglycerides', 75)]),
      review('b', [item('hdl', 60)]),
    ]);
    expect(m.derived.find((d) => d.key === 'ratio_tg_hdl')?.value).toBe(1.25);
  });

  it('concatena otherValues de todas las fotos', () => {
    const m = mergeReviews([
      review('a', [item('ldl', 100)], { otherValues: [{ name: 'x' }] }),
      review('b', [item('hdl', 60)], { otherValues: [{ name: 'y' }] }),
    ]);
    expect(m.otherValues.length).toBe(2);
  });
});
