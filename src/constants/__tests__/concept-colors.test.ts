/**
 * Sprint 2 E — guard de la fuente única de color por concepto (audit §3).
 * Un concepto = UN color en toda la app: si alguien vuelve a hardcodear un hex
 * distinto en hoy-cards/electrons para un concepto canónico, esto truena.
 */
import { describe, it, expect } from 'vitest';
import { CONCEPT_COLORS } from '../concept-colors';
import { HOY_CARD_BY_KEY } from '../hoy-cards';
import { ELECTRON_WEIGHTS } from '../electrons';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('CONCEPT_COLORS (fuente única)', () => {
  it('todos los conceptos tienen color y gradient hex válidos', () => {
    for (const [key, c] of Object.entries(CONCEPT_COLORS)) {
      expect(c.color, `${key}.color`).toMatch(HEX);
      expect(c.gradient, `${key}.gradient`).toHaveLength(2);
      for (const g of c.gradient) expect(g, `${key}.gradient`).toMatch(HEX);
    }
  });

  it('canónicos del audit: suplementos naranja, fitness lima, nutrición azul (brand.ts §1)', () => {
    expect(CONCEPT_COLORS.suplementos.color).toBe('#EF9F27');
    expect(CONCEPT_COLORS.fitness.color).toBe('#A8E02A');
    expect(CONCEPT_COLORS.nutricion.color).toBe('#5B9BD5');
  });
});

describe('HOY (hoy-cards) lee del canónico', () => {
  const cases: [string, keyof typeof CONCEPT_COLORS][] = [
    ['suplementos', 'suplementos'],
    ['fuerza', 'fitness'],
    ['proteina', 'nutricion'],
    ['agua', 'agua'],
    ['luz_solar', 'sol'],
    ['uv', 'sol'],
    ['cardio', 'cardio'],
  ];
  for (const [cardKey, concept] of cases) {
    it(`card ${cardKey} → CONCEPT_COLORS.${concept}`, () => {
      expect(HOY_CARD_BY_KEY[cardKey].gradient).toBe(CONCEPT_COLORS[concept].gradient);
    });
  }
});

describe('electrones leen del canónico (antes: suplementos lima, proteína azul claro)', () => {
  it('strength = fitness · supplements = suplementos · protein = nutricion', () => {
    expect(ELECTRON_WEIGHTS.strength.color).toBe(CONCEPT_COLORS.fitness.color);
    expect(ELECTRON_WEIGHTS.supplements.color).toBe(CONCEPT_COLORS.suplementos.color);
    expect(ELECTRON_WEIGHTS.protein.color).toBe(CONCEPT_COLORS.nutricion.color);
  });

  it('los ya-coherentes también migrados: water = agua · sunlight = sol', () => {
    expect(ELECTRON_WEIGHTS.water.color).toBe(CONCEPT_COLORS.agua.color);
    expect(ELECTRON_WEIGHTS.sunlight.color).toBe(CONCEPT_COLORS.sol.color);
  });
});
