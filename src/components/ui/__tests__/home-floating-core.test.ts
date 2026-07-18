import { describe, expect, it } from 'vitest';

import { shouldHideHomeButton } from '../home-floating-core';

const visible = (pathname: string) =>
  !shouldHideHomeButton({ pathname, keyboardVisible: false });

describe('shouldHideHomeButton (#26)', () => {
  it('oculto SOLO en HOY (HOME-1: persistente en el resto de la app)', () => {
    expect(visible('/')).toBe(false);
    expect(visible('/index')).toBe(false);
  });

  it('visible en los tabs hermanos /yo y /kit (HOME-1)', () => {
    expect(visible('/yo')).toBe(true);
    expect(visible('/kit')).toBe(true);
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
