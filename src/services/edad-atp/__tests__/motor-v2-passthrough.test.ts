import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import { resolveParamValues } from '../load-all-params';

const EMPTY = { canon: {}, hm: {}, quest: {}, ft: {} };

describe('load-all-params — passthrough motor v2 (keys fuera de la matriz)', () => {
  it('copia go_no_go_rt_hits + go_no_go_error_rate desde functional_tests', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      ft: { go_no_go_rt_hits: 320, go_no_go_error_rate: 12, reaction_time_simple: 290, plank: 90 },
    });
    expect(out.go_no_go_rt_hits).toBe(320);
    expect(out.go_no_go_error_rate).toBe(12);
    expect(out.reaction_time_simple).toBe(290);
    expect(out.plank).toBe(90);
  });

  it('copia subjetivos cognitivos desde questionnaire', () => {
    const out = resolveParamValues('male', {
      ...EMPTY,
      quest: { claridad_mental: 7, energia_mental: 8, memoria_autopercibida: 6 },
    });
    expect(out.claridad_mental).toBe(7);
    expect(out.energia_mental).toBe(8);
    expect(out.memoria_autopercibida).toBe(6);
  });
});
