import { describe, it, expect } from 'vitest';
import {
  effectiveOrder, isHidden, moveSection, toggleSection, parsePrefs, EMPTY_PREFS,
} from '../report-prefs-core';

const DEFAULTS = ['a', 'b', 'c', 'd'] as const;

describe('report-prefs-core', () => {
  it('sin prefs → orden default', () => {
    expect(effectiveOrder(DEFAULTS, null)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('orden guardado manda; keys nuevas del default se apendean', () => {
    expect(effectiveOrder(DEFAULTS, { order: ['c', 'a'], hidden: [] }))
      .toEqual(['c', 'a', 'b', 'd']);
  });

  it('keys guardadas que ya no existen se descartan', () => {
    expect(effectiveOrder(DEFAULTS, { order: ['zombie', 'b'], hidden: [] }))
      .toEqual(['b', 'a', 'c', 'd']);
  });

  it('moveSection mueve y respeta bordes', () => {
    expect(moveSection(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveSection(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveSection(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(moveSection(['a', 'b', 'c'], 'nope', 1)).toEqual(['a', 'b', 'c']);
  });

  it('toggleSection prende/apaga sin duplicar', () => {
    const off = toggleSection(EMPTY_PREFS, 'x');
    expect(off.hidden).toEqual(['x']);
    expect(isHidden(off, 'x')).toBe(true);
    const on = toggleSection(off, 'x');
    expect(on.hidden).toEqual([]);
    expect(isHidden(on, 'x')).toBe(false);
  });

  it('parsePrefs rechaza basura y filtra tipos', () => {
    expect(parsePrefs(null)).toBeNull();
    expect(parsePrefs('not json')).toBeNull();
    expect(parsePrefs('{"order":"x"}')).toBeNull();
    expect(parsePrefs('{"order":["a",1],"hidden":["b",null]}'))
      .toEqual({ order: ['a'], hidden: ['b'] });
  });
});
