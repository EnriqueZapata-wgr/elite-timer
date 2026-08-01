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

  it('MB-19: también en las tres salas nuevas', () => {
    // La lista local se quedó atrás cuando el tab bar pasó a cinco salas y la
    // casita iba a taparles el header, igual que le pasó a "TU ECOSISTEMA".
    // Ahora sale de RUTAS_DE_TAB y no puede volver a desincronizarse.
    expect(visible('/salud')).toBe(false);
    expect(visible('/tribu')).toBe(false);
    expect(visible('/argos')).toBe(false);
  });

  it('MB-19: y en las cuatro retiradas del tab bar, que siguen renderizando con tabs', () => {
    expect(visible('/biblioteca')).toBe(false);
    expect(visible('/progreso')).toBe(false);
    expect(visible('/perfil')).toBe(false);
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

  it('oculto cuando la pantalla trae casita propia (V1.5.1 #8: nav-presence)', () => {
    expect(shouldHideHomeButton({ pathname: '/supplements', keyboardVisible: false, screenHasOwnNav: true })).toBe(true);
    // Sin header estándar el flotante sigue (fallback legacy).
    expect(shouldHideHomeButton({ pathname: '/supplements', keyboardVisible: false, screenHasOwnNav: false })).toBe(false);
  });

  it('oculto en el pilar Mente — el banner fijo ya trae home (Overhaul A3)', () => {
    expect(visible('/mente')).toBe(false);
    expect(visible('/mente/player')).toBe(false);
    expect(visible('/mente/progreso')).toBe(false);
    expect(visible('/meditation')).toBe(false);
    expect(visible('/breathing')).toBe(false);
    expect(visible('/journal')).toBe(true); // journal conserva el flotante
  });
});
