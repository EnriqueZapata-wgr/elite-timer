import { describe, it, expect } from 'vitest';
import {
  isOnboardingPath,
  shouldHideFloatingButton,
} from '@/src/components/argos/argos-floating-core';

const base = {
  pathname: '/nutrition',
  keyboardVisible: false,
  manualHidden: false,
  introduced: true,
};

describe('isOnboardingPath', () => {
  it('detecta onboarding y auth', () => {
    expect(isOnboardingPath('/onboarding/v2/welcome')).toBe(true);
    expect(isOnboardingPath('/login')).toBe(true);
    expect(isOnboardingPath('/register')).toBe(true);
    expect(isOnboardingPath('/reset-password')).toBe(true);
    expect(isOnboardingPath('/argos/meet')).toBe(true);
  });
  it('rutas normales → false', () => {
    expect(isOnboardingPath('/nutrition')).toBe(false);
    expect(isOnboardingPath('/')).toBe(false);
    expect(isOnboardingPath(null)).toBe(false);
  });
});

describe('shouldHideFloatingButton', () => {
  it('visible en una pantalla normal, presentado, sin teclado', () => {
    expect(shouldHideFloatingButton(base)).toBe(false);
  });

  it('oculto si aún no se presentó a ARGOS (pre Meet ARGOS)', () => {
    expect(shouldHideFloatingButton({ ...base, introduced: false })).toBe(true);
  });

  it('oculto si la pantalla lo ocultó manualmente', () => {
    expect(shouldHideFloatingButton({ ...base, manualHidden: true })).toBe(true);
  });

  it('oculto en onboarding', () => {
    expect(shouldHideFloatingButton({ ...base, pathname: '/onboarding/v2/goal' })).toBe(true);
  });

  it('oculto en el propio chat ARGOS (redundante)', () => {
    expect(shouldHideFloatingButton({ ...base, pathname: '/argos-chat' })).toBe(true);
    expect(shouldHideFloatingButton({ ...base, pathname: '/argos/conversations' })).toBe(true);
  });

  it('oculto con el teclado abierto (no tapar inputs)', () => {
    expect(shouldHideFloatingButton({ ...base, keyboardVisible: true })).toBe(true);
  });

  it('prioridad: introduced=false gana incluso sobre pantalla válida', () => {
    expect(
      shouldHideFloatingButton({ pathname: '/', keyboardVisible: false, manualHidden: false, introduced: false }),
    ).toBe(true);
  });
});
