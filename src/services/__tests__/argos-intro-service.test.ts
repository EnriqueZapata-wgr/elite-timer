import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * T6 MAGIA ARGOS — flag argos_introduced_at. Mock encadenable mínimo de supabase
 * (from().select().eq().single() y from().update().eq().is()) para validar la
 * lógica del servicio sin cargar react-native/expo.
 */
const h = vi.hoisted(() => ({
  selectResult: { data: null as any },
  updateResult: { error: null as any },
}));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve(h.selectResult) }) }),
      update: () => ({ eq: () => ({ is: () => Promise.resolve(h.updateResult) }) }),
    }),
  },
}));
vi.mock('@/src/lib/logger', () => ({ error: vi.fn() }));

import { hasArgosBeenIntroduced, markArgosIntroduced } from '@/src/services/argos-intro-service';

beforeEach(() => {
  h.selectResult = { data: null };
  h.updateResult = { error: null };
});

describe('hasArgosBeenIntroduced', () => {
  it('true cuando argos_introduced_at tiene valor', async () => {
    h.selectResult = { data: { argos_introduced_at: '2026-07-08T00:00:00Z' } };
    expect(await hasArgosBeenIntroduced('u1')).toBe(true);
  });
  it('false cuando es null (aún no presentado)', async () => {
    h.selectResult = { data: { argos_introduced_at: null } };
    expect(await hasArgosBeenIntroduced('u1')).toBe(false);
  });
  it('false (fail-open) si no hay data', async () => {
    h.selectResult = { data: null };
    expect(await hasArgosBeenIntroduced('u1')).toBe(false);
  });
});

describe('markArgosIntroduced', () => {
  it('true cuando el update no da error', async () => {
    h.updateResult = { error: null };
    expect(await markArgosIntroduced('u1')).toBe(true);
  });
  it('false cuando el update da error', async () => {
    h.updateResult = { error: { message: 'boom' } };
    expect(await markArgosIntroduced('u1')).toBe(false);
  });
});
