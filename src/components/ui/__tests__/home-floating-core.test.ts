import { describe, expect, it } from 'vitest';

import { shouldHideHomeButton } from '../home-floating-core';

const visible = (pathname: string) =>
  !shouldHideHomeButton({ pathname, keyboardVisible: false });

describe('shouldHideHomeButton (#26)', () => {
  it('oculto en TODOS los tabs (triple-audit P1.2: la casita tapaba headers de yo/kit)', () => {
    expect(visible('/')).toBe(false);
    expect(visible('/index')).toBe(false);
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

  it('oculto en el pilar Mente — el banner fijo ya trae home (Overhaul A3)', () => {
    expect(visible('/mente')).toBe(false);
    expect(visible('/mente/player')).toBe(false);
    expect(visible('/mente/descanso')).toBe(false);
    expect(visible('/meditation')).toBe(false);
    expect(visible('/breathing')).toBe(false);
    expect(visible('/journal')).toBe(true); // journal conserva el flotante
  });
});
