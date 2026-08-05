import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONSENT_DEFAULTS, CONSENT_META } from '../consent-core';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({ fake: null as any }));

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    auth: { getUser: () => state.fake.auth.getUser() },
  },
}));

import { hasArgosMemoryConsent, invalidateArgosConsentCache } from '../consent-service';

describe('consent (#132)', () => {
  it('defaults alineados al schema de la migración 100', () => {
    expect(CONSENT_DEFAULTS).toEqual({
      analytics_posthog: true,
      argos_persistent_memory: true,
      marketing_communications: false,
      share_anonymized_research: false,
      share_with_clinician: true,
    });
  });

  it('los 5 toggles del spec están en CONSENT_META con descripción', () => {
    expect(CONSENT_META).toHaveLength(5);
    const keys = CONSENT_META.map(m => m.key);
    expect(keys).toEqual([
      'analytics_posthog',
      'argos_persistent_memory',
      'marketing_communications',
      'share_anonymized_research',
      'share_with_clinician',
    ]);
    for (const m of CONSENT_META) {
      expect(m.title.length).toBeGreaterThan(3);
      expect(m.description.length).toBeGreaterThan(10);
    }
  });
});

/**
 * MB-21 P7 — hasArgosMemoryConsent: la fuente del gate de memoria de ARGOS.
 * La distinción que importa: "no hay fila" (default del schema: ON) NO es lo
 * mismo que "la query falló" (LANZA — el gate decide cerrado).
 */
describe('hasArgosMemoryConsent (MB-21 P7)', () => {
  beforeEach(() => {
    state.fake = null;
    // El cache de 60s vive a nivel de módulo — cada test arranca limpio.
    invalidateArgosConsentCache();
  });

  it('fila con memoria APAGADA → false', async () => {
    state.fake = makeFakeSupabase({
      user_consent: { data: { argos_persistent_memory: false }, error: null },
    });
    expect(await hasArgosMemoryConsent('u1')).toBe(false);
  });

  it('fila con memoria ENCENDIDA → true', async () => {
    state.fake = makeFakeSupabase({
      user_consent: { data: { argos_persistent_memory: true }, error: null },
    });
    expect(await hasArgosMemoryConsent('u1')).toBe(true);
  });

  it('sin fila → default del schema (ON): usuario que nunca tocó settings', async () => {
    state.fake = makeFakeSupabase({
      user_consent: { data: null, error: null },
    });
    expect(await hasArgosMemoryConsent('u1')).toBe(true);
  });

  it('query FALLA → LANZA (nada de defaults silenciosos: el gate decide cerrado)', async () => {
    // supabase-js no lanza en 4xx: {error} es LA señal (MB-6). La mutación
    // que este test entierra: tragarse el error y devolver el default ON.
    state.fake = makeFakeSupabase({
      user_consent: { data: null, error: { message: 'permission denied' } },
    });
    await expect(hasArgosMemoryConsent('u1')).rejects.toThrow('query failed');
  });

  it('un fallo NO se cachea: la siguiente llamada vuelve a preguntar', async () => {
    state.fake = makeFakeSupabase({
      user_consent: [
        { data: null, error: { message: 'timeout' } },
        { data: { argos_persistent_memory: false }, error: null },
      ],
    });
    await expect(hasArgosMemoryConsent('u1')).rejects.toThrow();
    expect(await hasArgosMemoryConsent('u1')).toBe(false);
    expect(state.fake.queried.filter((t: string) => t === 'user_consent')).toHaveLength(2);
  });

  it('el valor SÍ se cachea 60s (no una query extra por cada mensaje del chat)', async () => {
    state.fake = makeFakeSupabase({
      user_consent: { data: { argos_persistent_memory: true }, error: null },
    });
    await hasArgosMemoryConsent('u1');
    await hasArgosMemoryConsent('u1');
    expect(state.fake.queried.filter((t: string) => t === 'user_consent')).toHaveLength(1);
  });
});
