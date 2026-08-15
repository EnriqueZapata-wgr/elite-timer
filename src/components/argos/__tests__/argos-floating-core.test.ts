import { describe, it, expect } from 'vitest';
import {
  isMentePillarPath,
  isOnboardingPath,
  isPublicEmergencyPath,
  isTabRootPath,
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

describe('isPublicEmergencyPath (FIX-215)', () => {
  it('la ficha pública de la raíz', () => {
    expect(isPublicEmergencyPath('/ficha-emergencia')).toBe(true);
    expect(isPublicEmergencyPath('/ficha-emergencia/')).toBe(true);
    expect(isPublicEmergencyPath('/Ficha-Emergencia')).toBe(true);
  });

  it('el editor detrás de la sesión NO es la ficha pública', () => {
    // /salud/ficha-emergencia es donde el dueño captura sus datos: vive dentro
    // de la app y conserva la navegación normal.
    expect(isPublicEmergencyPath('/salud/ficha-emergencia')).toBe(false);
    expect(isPublicEmergencyPath('/settings/salud')).toBe(false);
    expect(isPublicEmergencyPath(null)).toBe(false);
  });
});

describe('isMentePillarPath (Overhaul Mente A3/A4)', () => {
  it('detecta el hub, sub-rutas y las pantallas de práctica del pilar', () => {
    expect(isMentePillarPath('/mente')).toBe(true);
    expect(isMentePillarPath('/mente/player')).toBe(true);
    expect(isMentePillarPath('/mente/progreso')).toBe(true);
    expect(isMentePillarPath('/meditation')).toBe(true);
    expect(isMentePillarPath('/breathing')).toBe(true);
  });
  it('journal/check-in y rutas ajenas conservan los flotantes', () => {
    expect(isMentePillarPath('/journal')).toBe(false);
    expect(isMentePillarPath('/checkin')).toBe(false);
    expect(isMentePillarPath('/nutrition')).toBe(false);
    expect(isMentePillarPath(null)).toBe(false);
  });
});

describe('isTabRootPath (MB-19: la orbe vive en el tab bar)', () => {
  it('detecta las cinco salas', () => {
    for (const p of ['/', '/kit', '/salud', '/tribu', '/argos']) {
      expect(isTabRootPath(p), p).toBe(true);
    }
  });

  it('detecta también las tres retiradas con href: null', () => {
    // Siguen siendo rutas del grupo (tabs) y renderizan CON tab bar. Si no
    // estuvieran, sobre ellas saldrían la orbe y el flotante a la vez.
    // Eran cuatro: `/yo` se cayó en NOCHE-ARGOS porque ya no existe como ruta.
    for (const p of ['/biblioteca', '/progreso', '/perfil']) {
      expect(isTabRootPath(p), p).toBe(true);
    }
  });

  it('una ruta que ya no existe NO se considera tab', () => {
    // Candado del borrado: `/yo` vivió en RUTAS_DE_TAB después de que la
    // pantalla muriera. Este Set es la fuente única de "qué es un tab" y con
    // datos muertos deja de ser confiable.
    expect(isTabRootPath('/yo')).toBe(false);
  });

  it('es LA lista: la casita usa la misma, no una copia', async () => {
    // A1 del audit: había dos listas y se desincronizaron en cuanto el tab bar
    // cambió. Este test falla si alguien vuelve a hacerse una local.
    const { shouldHideHomeButton } = await import('@/src/components/ui/home-floating-core');
    const { RUTAS_DE_TAB } = await import('@/src/components/argos/argos-floating-core');
    for (const p of RUTAS_DE_TAB) {
      expect(shouldHideHomeButton({ pathname: p, keyboardVisible: false }), p).toBe(true);
      expect(shouldHideFloatingButton({ ...base, pathname: p }), p).toBe(true);
    }
  });

  it('una pantalla empujada NO es una sala: ahí el flotante es el único acceso', () => {
    for (const p of ['/nutrition', '/salud/hoy', '/comunidad/ranking', '/atp-orden', '/health-hub']) {
      expect(isTabRootPath(p), p).toBe(false);
    }
  });

  it('tolera la diagonal final y las mayúsculas', () => {
    expect(isTabRootPath('/kit/')).toBe(true);
    expect(isTabRootPath('/SALUD')).toBe(true);
    expect(isTabRootPath(null)).toBe(false);
  });
});

describe('shouldHideFloatingButton', () => {
  it('oculto en las cinco salas: la orbe ya está al centro de la barra', () => {
    for (const p of ['/', '/kit', '/salud', '/tribu']) {
      expect(shouldHideFloatingButton({ ...base, pathname: p }), p).toBe(true);
    }
  });

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

  it('oculto en la ficha de emergencia pública (FIX-215), visible en el editor', () => {
    expect(shouldHideFloatingButton({ ...base, pathname: '/ficha-emergencia' })).toBe(true);
    expect(shouldHideFloatingButton({ ...base, pathname: '/salud/ficha-emergencia' })).toBe(false);
  });

  it('oculto con el teclado abierto (no tapar inputs)', () => {
    expect(shouldHideFloatingButton({ ...base, keyboardVisible: true })).toBe(true);
  });

  it('oculto en el pilar Mente (banner fijo) y en el player (full focus, A4)', () => {
    expect(shouldHideFloatingButton({ ...base, pathname: '/mente' })).toBe(true);
    expect(shouldHideFloatingButton({ ...base, pathname: '/mente/player' })).toBe(true);
    expect(shouldHideFloatingButton({ ...base, pathname: '/meditation' })).toBe(true);
    expect(shouldHideFloatingButton({ ...base, pathname: '/breathing' })).toBe(true);
  });

  it('prioridad: introduced=false gana incluso sobre pantalla válida', () => {
    expect(
      shouldHideFloatingButton({ pathname: '/', keyboardVisible: false, manualHidden: false, introduced: false }),
    ).toBe(true);
  });
});
