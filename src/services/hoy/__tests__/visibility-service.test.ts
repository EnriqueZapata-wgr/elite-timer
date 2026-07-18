import { describe, it, expect, vi, beforeEach } from 'vitest';

// La parte pura (parseVisible/applyToggle) no necesita supabase; getCardsVisible sí → lo mockeamos.
const maybeSingle = vi.fn();
const updateEq = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }),
      update: () => ({ eq: (...a: any[]) => updateEq(...a) }),
    }),
  },
}));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { parseVisible, applyToggle, applyManualOverride, getCardsVisible } from '@/src/services/hoy/visibility-service';
import { HOY_CARD_ORDER_DEFAULT } from '@/src/constants/hoy-cards';

beforeEach(() => { maybeSingle.mockReset(); });

describe('parseVisible', () => {
  it('null / no-array → default (todas visibles)', () => {
    expect(parseVisible(null).size).toBe(HOY_CARD_ORDER_DEFAULT.length);
    expect(parseVisible(undefined).size).toBe(HOY_CARD_ORDER_DEFAULT.length);
    expect(parseVisible('nope').size).toBe(HOY_CARD_ORDER_DEFAULT.length);
  });
  it('array vacío → set vacío (usuario ocultó todo)', () => {
    expect(parseVisible([]).size).toBe(0);
  });
  it('array con cards → solo esas', () => {
    const s = parseVisible(['uv', 'agua']);
    expect(s.has('uv')).toBe(true);
    expect(s.has('agua')).toBe(true);
    expect(s.has('fuerza')).toBe(false);
  });
  it('filtra valores no-string', () => {
    expect(parseVisible(['uv', 3, null, 'agua']).size).toBe(2);
  });
});

describe('applyToggle', () => {
  it('apaga una card y conserva orden canónico', () => {
    const cur = new Set(['uv', 'checkin', 'agua']);
    const next = applyToggle(cur, 'checkin', false);
    expect(next).not.toContain('checkin');
    expect(next).toContain('uv');
    // orden canónico: uv antes que agua
    expect(next.indexOf('uv')).toBeLessThan(next.indexOf('agua'));
  });
  it('prende una card', () => {
    const next = applyToggle(new Set(['uv']), 'fuerza', true);
    expect(next).toContain('fuerza');
    expect(next).toContain('uv');
  });
});

describe('applyManualOverride (ítem 1 triple-audit — override aprobado)', () => {
  const derived = new Set(['uv', 'checkin', 'agua', 'meditacion', 'journal']);

  it('sin config manual (null / no-array) → el motor manda tal cual', () => {
    expect(applyManualOverride(derived, null)).toEqual(derived);
    expect(applyManualOverride(derived, undefined)).toEqual(derived);
    expect(applyManualOverride(derived, 'nope')).toEqual(derived);
  });

  it('hide explícito del user RESTA una card aunque sea baseline/prescrita', () => {
    // El user persistió todas MENOS meditacion → meditacion se oculta.
    const manual = HOY_CARD_ORDER_DEFAULT.filter((k) => k !== 'meditacion');
    const out = applyManualOverride(derived, manual);
    expect(out.has('meditacion')).toBe(false);
    expect(out.has('journal')).toBe(true);
    expect(out.has('uv')).toBe(true);
  });

  it('guard anti-vacío: si el override dejara 0 cards, gana el derivado', () => {
    expect(applyManualOverride(derived, [])).toEqual(derived);
  });

  it('cards derivadas fuera del catálogo HOY no se ven afectadas por el array manual', () => {
    const withExtra = new Set([...derived, 'card_futura']);
    const manual = HOY_CARD_ORDER_DEFAULT.filter((k) => k !== 'uv');
    const out = applyManualOverride(withExtra, manual);
    expect(out.has('card_futura')).toBe(true);
    expect(out.has('uv')).toBe(false);
  });
});

describe('getCardsVisible', () => {
  it('sin fila → default', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const s = await getCardsVisible('u1');
    expect(s.size).toBe(HOY_CARD_ORDER_DEFAULT.length);
  });
  it('con array guardado → ese set', async () => {
    maybeSingle.mockResolvedValue({ data: { hoy_cards_visible: ['uv', 'agua'] }, error: null });
    const s = await getCardsVisible('u1');
    expect([...s].sort()).toEqual(['agua', 'uv']);
  });
  it('error de query → default (HOY nunca vacío)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const s = await getCardsVisible('u1');
    expect(s.size).toBe(HOY_CARD_ORDER_DEFAULT.length);
  });
});
