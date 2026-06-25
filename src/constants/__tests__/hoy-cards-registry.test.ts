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

  it('el orden default incluye hero_agenda + ayuno + las cards del registro', () => {
    expect(HOY_CARD_ORDER_DEFAULT[0]).toBe('hero_agenda');
    expect(HOY_CARD_ORDER_DEFAULT.length).toBe(21); // hero + ayuno (inline) + 19 con spec
    expect(HOY_CARD_ORDER_DEFAULT).toContain('ayuno');
    // las 5 nuevas (#cableado-final) deben estar en el registro
    for (const k of ['no_alcohol', 'sleep', 'journal', 'no_processed_foods', 'screen_time_cutoff']) {
      expect(HOY_CARD_BY_KEY[k], k).toBeTruthy();
    }
    // toda card del orden (salvo hero_agenda y ayuno, que son cards inline especiales sin spec)
    // debe estar en el registro.
    for (const k of HOY_CARD_ORDER_DEFAULT.filter((x) => x !== 'hero_agenda' && x !== 'ayuno')) {
      expect(HOY_CARD_BY_KEY[k], k).toBeTruthy();
    }
  });
});
