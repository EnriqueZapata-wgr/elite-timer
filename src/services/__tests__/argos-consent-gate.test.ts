/**
 * MB-21 P7 — el gate de consentimiento amarrado DONDE VIVE EL RIESGO
 * (patrón MB-22.1 P4): loadUserContext es la raíz que arma los ~25 bloques
 * de datos del usuario que viajan al modelo. Si el gate se afloja, la salud
 * de un usuario que revocó su permiso entra al prompt.
 *
 * Antes de este test, aflojar la raíz no tronaba nada. Ahora truena aquí.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeSupabase } from './supabase-fake';

const state = vi.hoisted(() => ({
  fake: null as any,
  consent: (async () => true) as () => Promise<boolean>,
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' } } },
}));
vi.mock('react-native', () => ({
  DeviceEventEmitter: { emit: () => {}, addListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'ios', select: (o: any) => o?.ios },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}));
vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (t: string) => state.fake.from(t),
    auth: { getUser: () => state.fake.auth.getUser() },
  },
}));
vi.mock('@/src/lib/logger', () => ({
  log: () => {}, warn: () => {}, error: () => {},
}));
vi.mock('@/src/services/consent-service', () => ({
  hasArgosMemoryConsent: () => state.consent(),
  invalidateArgosConsentCache: () => {},
}));

import { loadUserContext } from '@/src/services/argos-service';
import { buildContextPrompt } from '@/src/services/argos-context-core';

/** Tablas de salud con datos REALES en el fake — si el gate se abre, salen. */
function fakeWithHealthData() {
  return makeFakeSupabase({
    profiles: { data: { full_name: 'Enrique' }, error: null },
    client_profiles: { data: { date_of_birth: '1986-01-01', biological_sex: 'male' }, error: null },
    glucose_logs: { data: [{ value_mg_dl: 95, context: 'ayunas', date: '2026-08-05' }], error: null },
    electron_logs: { data: [{ electrons: 5 }], error: null },
  });
}

beforeEach(() => {
  state.fake = fakeWithHealthData();
  state.consent = async () => true;
});

describe('loadUserContext — la raíz del contexto hacia el modelo', () => {
  it('consentimiento ENCENDIDO → carga contexto rico (lo de siempre)', async () => {
    const ctx = await loadUserContext('user-test');
    expect(ctx.name).toBe('Enrique');
    expect(state.fake.queried).toContain('profiles');
    expect(state.fake.queried).toContain('glucose_logs');
  });

  it('consentimiento APAGADO → contexto mínimo y NI SIQUIERA consulta tablas de salud', async () => {
    state.consent = async () => false;
    const ctx = await loadUserContext('user-test');
    expect(ctx).toEqual({ name: '' });
    expect(state.fake.queried).toEqual([]);
    // Y el prompt que se armaría con ese contexto es exactamente vacío:
    expect(buildContextPrompt(ctx)).toBe('');
  });

  it('el servicio de consentimiento FALLA → FAIL-CLOSED: mismo contexto mínimo, cero queries', async () => {
    // LA mutación que este test entierra: volver el catch a fail-open. Con
    // eso, un usuario que revocó veía sus datos de salud viajar al modelo
    // cada vez que la query de consentimiento fallara.
    state.consent = async () => { throw new Error('consent service caído'); };
    const ctx = await loadUserContext('user-test');
    expect(ctx).toEqual({ name: '' });
    expect(state.fake.queried).toEqual([]);
    expect(buildContextPrompt(ctx)).toBe('');
  });
});
