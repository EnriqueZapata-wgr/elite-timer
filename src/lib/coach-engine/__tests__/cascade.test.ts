import { describe, it, expect } from 'vitest';
import { selectCascadeLevel } from '../cascade';

describe('cascade (pure)', () => {
  it('verde + no recurre → 1', () => {
    expect(selectCascadeLevel('verde', false)).toBe(1);
  });

  it('verde + recurre → 1 (verde no escala)', () => {
    expect(selectCascadeLevel('verde', true)).toBe(1);
  });

  it('amarillo + no recurre → 2', () => {
    expect(selectCascadeLevel('amarillo', false)).toBe(2);
  });

  it('amarillo + recurre → 3', () => {
    expect(selectCascadeLevel('amarillo', true)).toBe(3);
  });

  it('rojo + no recurre → 3', () => {
    expect(selectCascadeLevel('rojo', false)).toBe(3);
  });

  it('rojo + recurre → 4', () => {
    expect(selectCascadeLevel('rojo', true)).toBe(4);
  });
});
