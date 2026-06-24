import { describe, it, expect } from 'vitest';
import { HOY_CARD_SPECS, HOY_CARD_BY_KEY, HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';

/**
 * #tabs-redesign V1.3 — el registro de cards del HOY debe ser consistente con lo que renderiza
 * HoyEditorialSection (los 8 electrones + 4 data cards). Catch de typos de cardKey.
 */
describe('HOY card registry', () => {
  it('las 8 cards de electrones existen en el registro', () => {
    for (const k of ['luz_solar', 'meditacion', 'suplementos', 'bano_frio', 'grounding', 'fuerza', 'breathwork', 'lentes_rojos']) {
      expect(HOY_CARD_BY_KEY[k], k).toBeTruthy();
    }
  });

  it('las 4 data cards + cardio/pasos existen', () => {
    for (const k of ['uv', 'checkin', 'proteina', 'agua', 'cardio', 'pasos']) {
      expect(HOY_CARD_BY_KEY[k], k).toBeTruthy();
    }
  });

  it('cada spec tiene gradient de 2 colores y título', () => {
    for (const spec of HOY_CARD_SPECS) {
      expect(spec.gradient.length).toBe(2);
      expect(spec.title.length).toBeGreaterThan(0);
    }
  });

  it('el orden default (hero + 14) incluye hero_agenda y las 14 cards', () => {
    expect(HOY_CARD_ORDER_DEFAULT[0]).toBe('hero_agenda');
    expect(HOY_CARD_ORDER_DEFAULT.length).toBe(15);
    // toda card del orden (salvo el hero) debe estar en el registro
    for (const k of HOY_CARD_ORDER_DEFAULT.filter((x) => x !== 'hero_agenda')) {
      expect(HOY_CARD_BY_KEY[k], k).toBeTruthy();
    }
  });
});
