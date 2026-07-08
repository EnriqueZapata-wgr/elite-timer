import { describe, expect, it } from 'vitest';

import {
  nextTierInfo,
  RANK_TIERS_V2,
  tierComparisonLabel,
  tierFromLifetime,
  tierIndex,
} from '../rank-tiers';

describe('tierFromLifetime — umbrales del spec #100', () => {
  it('bordes exactos de cada tier', () => {
    expect(tierFromLifetime(0).key).toBe('explorer');
    expect(tierFromLifetime(49).key).toBe('explorer');
    expect(tierFromLifetime(50).key).toBe('biohacker');
    expect(tierFromLifetime(199).key).toBe('biohacker');
    expect(tierFromLifetime(200).key).toBe('optimizer');
    expect(tierFromLifetime(499).key).toBe('optimizer');
    expect(tierFromLifetime(500).key).toBe('longevo');
    expect(tierFromLifetime(999).key).toBe('longevo');
    expect(tierFromLifetime(1000).key).toBe('master');
    expect(tierFromLifetime(2499).key).toBe('master');
    expect(tierFromLifetime(2500).key).toBe('legend');
    expect(tierFromLifetime(4999).key).toBe('legend');
    expect(tierFromLifetime(5000).key).toBe('inmortal');
    expect(tierFromLifetime(9999).key).toBe('inmortal');
  });

  it('easter eggs: Brian Johnson 10K+ y God 25K+', () => {
    expect(tierFromLifetime(10000).key).toBe('brian_johnson');
    expect(tierFromLifetime(24999).key).toBe('brian_johnson');
    expect(tierFromLifetime(25000).key).toBe('god');
    expect(tierFromLifetime(1_000_000).key).toBe('god');
  });

  it('valores raros no rompen', () => {
    expect(tierFromLifetime(-5).key).toBe('explorer');
    expect(tierFromLifetime(NaN as any).key).toBe('explorer');
  });
});

describe('nextTierInfo — visibilidad de metas', () => {
  it('progresión normal muestra el siguiente', () => {
    const info = nextTierInfo(766); // Longevo
    expect(info.next?.key).toBe('master');
    expect(info.remaining).toBe(234); // "faltan 234" del spec
  });

  it('Legend ve Inmortal como meta', () => {
    expect(nextTierInfo(3000).next?.key).toBe('inmortal');
  });

  it('Brian Johnson NO se anuncia antes de Inmortal (easter egg)', () => {
    // Un Legend no ve a Brian Johnson como meta... pero un Inmortal sí
    expect(nextTierInfo(5000).next?.key).toBe('brian_johnson');
  });

  it('God JAMÁS se anuncia (secret)', () => {
    expect(nextTierInfo(12000).next).toBeNull(); // Brian Johnson no ve God
  });
});

describe('tierComparisonLabel', () => {
  it('formato del spec: "Eres X · faltan N E- para Y"', () => {
    expect(tierComparisonLabel(766)).toBe('Eres Longevo · faltan 234 E- para Master');
  });

  it('Brian Johnson tease sin revelar God', () => {
    const label = tierComparisonLabel(15000);
    expect(label).toContain('Brian Johnson');
    expect(label).not.toContain('God');
  });

  it('God es el techo', () => {
    expect(tierComparisonLabel(30000)).toContain('God');
  });
});

describe('integridad del sistema', () => {
  it('tiers ordenados ascendentemente por min', () => {
    for (let i = 1; i < RANK_TIERS_V2.length; i++) {
      expect(RANK_TIERS_V2[i].min).toBeGreaterThan(RANK_TIERS_V2[i - 1].min);
    }
  });

  it('keys únicas + tierIndex consistente', () => {
    const keys = RANK_TIERS_V2.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(tierIndex('explorer')).toBe(0);
    expect(tierIndex('god')).toBe(RANK_TIERS_V2.length - 1);
    expect(tierIndex('nope')).toBe(-1);
  });
});
