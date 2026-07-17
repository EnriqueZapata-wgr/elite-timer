import { describe, expect, it } from 'vitest';

import { shouldHideHomeButton } from '../home-floating-core';

const visible = (pathname: string) =>
  !shouldHideHomeButton({ pathname, keyboardVisible: false });

describe('shouldHideHomeButton (#26)', () => {
  it('oculto en HOY y tabs (el tab bar ya da Home)', () => {
    expect(visible('/')).toBe(false);
    expect(visible('/yo')).toBe(false);
    expect(visible('/kit')).toBe(false);
  });

  it('visible en pantallas profundas del Stack', () => {
    expect(visible('/supplements')).toBe(true);
    expect(visible('/reports')).toBe(true);
    expect(visible('/sleep')).toBe(true);
    expect(visible('/journal')).toBe(true);
    expect(visible('/economy/admin')).toBe(true);
  });

  it('oculto en onboarding / auth / meet ARGOS (mismo criterio que ARGOS)', () => {
    expect(visible('/onboarding-v2')).toBe(false);
    expect(visible('/login')).toBe(false);
    expect(visible('/register')).toBe(false);
    expect(visible('/meet')).toBe(false);
  });

  it('oculto en el chat ARGOS (input abajo) y con teclado abierto', () => {
    expect(visible('/argos-chat')).toBe(false);
    expect(shouldHideHomeButton({ pathname: '/reports', keyboardVisible: true })).toBe(true);
  });

  it('pathname null → tratado como HOY (oculto, fail-safe)', () => {
    expect(shouldHideHomeButton({ pathname: null, keyboardVisible: false })).toBe(true);
  });
});
