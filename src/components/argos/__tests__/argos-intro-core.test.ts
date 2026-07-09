import { describe, it, expect } from 'vitest';
import { shouldTriggerMeetArgos } from '@/src/components/argos/argos-intro-core';

const BASE = {
  hasUser: true,
  introduced: false,
  pathname: '/(tabs)',
  alreadyTriggered: false,
};

describe('shouldTriggerMeetArgos — trigger para usuarios existentes (T3)', () => {
  it('usuario logueado + no presentado + en la app principal → dispara', () => {
    expect(shouldTriggerMeetArgos(BASE)).toBe(true);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/nutrition' })).toBe(true);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/yo' })).toBe(true);
  });

  it('ya presentado → nunca dispara', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, introduced: true })).toBe(false);
  });

  it('sin sesión → no dispara', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, hasUser: false })).toBe(false);
  });

  it('solo una vez por sesión (guard alreadyTriggered)', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, alreadyTriggered: true })).toBe(false);
  });

  it('en el index ("/") no dispara — la redirección inicial sigue en vuelo', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/' })).toBe(false);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: null })).toBe(false);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: undefined })).toBe(false);
  });

  it('durante onboarding/auth no dispara (el onboarding navega solo al final)', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/onboarding/v2/goal' })).toBe(false);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/login' })).toBe(false);
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/register' })).toBe(false);
  });

  it('en el propio /argos/meet no re-dispara (loop guard)', () => {
    expect(shouldTriggerMeetArgos({ ...BASE, pathname: '/argos/meet' })).toBe(false);
  });
});
